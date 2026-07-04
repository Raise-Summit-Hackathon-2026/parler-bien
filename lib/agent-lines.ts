import { randomInt } from "crypto"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"

export type WhatsAppStatus =
  | "none"
  | "shared"
  | "voice_sms_ready"
  | "whatsapp_pending"
  | "whatsapp_online"

export type AgentRole = "executive" | "sales" | "support" | "ops" | "custom"

export type AgentLine = {
  lineId: string
  userId: string
  /** Owner / employee mobile — outbound call-me + always on allowlist */
  userPhone: string
  pin: string
  agentName?: string
  displayName?: string
  workspaceName?: string
  ownerEmail?: string
  agentRole?: AgentRole
  /** Extra inbound numbers allowed on the dedicated line (owner is always allowed) */
  allowedCallerPhones?: string[]
  dedicatedPhoneNumber?: string
  twilioPhoneSid?: string
  agentPhoneAgentId?: string
  agentPhoneNumberId?: string
  telephonyProvider?: "agentphone" | "twilio"
  whatsappStatus?: WhatsAppStatus
  createdAt: string
}

const STORE_PATH = join(process.cwd(), ".data", "agent-lines.json")

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

function phonesMatch(a: string, b: string): boolean {
  const da = normalizePhone(a)
  const db = normalizePhone(b)
  if (!da || !db) return false
  return da === db || da.endsWith(db.slice(-9)) || db.endsWith(da.slice(-9))
}

function loadLines(): AgentLine[] {
  try {
    if (!existsSync(STORE_PATH)) return []
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as AgentLine[]
  } catch {
    return []
  }
}

function saveLines(lines: AgentLine[]): void {
  mkdirSync(join(process.cwd(), ".data"), { recursive: true })
  writeFileSync(STORE_PATH, JSON.stringify(lines, null, 2))
}

function randomLineId(): string {
  return randomInt(100000, 999999).toString()
}

function randomPin(): string {
  return randomInt(1000, 9999).toString()
}

export function parseAllowedCallerPhones(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : raw.split(/[,;\n]+/)
  return [...new Set(list.map((p) => p.trim()).filter((p) => p.replace(/\D/g, "").length >= 8))]
}

export function getLineByUserId(userId: string): AgentLine | undefined {
  return loadLines().find((line) => line.userId === userId)
}

export function getLineByPin(pin: string): AgentLine | undefined {
  return loadLines().find((line) => line.pin === pin.trim())
}

export function getLineByPhone(phone: string): AgentLine | undefined {
  const normalized = normalizePhone(phone)
  if (!normalized) return undefined
  return loadLines().find((line) => phonesMatch(line.userPhone, phone))
}

export function getLineByDedicatedNumber(phone: string): AgentLine | undefined {
  if (!phone) return undefined
  return loadLines().find((line) => {
    if (!line.dedicatedPhoneNumber) return false
    return phonesMatch(line.dedicatedPhoneNumber, phone)
  })
}

/** Enterprise inbound gate: owner + explicit allowlist on dedicated lines. */
export function isInboundCallerAllowed(
  line: AgentLine,
  callerPhone: string | undefined,
  viaDedicatedLine: boolean,
): boolean {
  if (!callerPhone?.trim()) return false
  if (phonesMatch(line.userPhone, callerPhone)) return true
  if (line.allowedCallerPhones?.some((p) => phonesMatch(p, callerPhone))) return true
  if (viaDedicatedLine && line.dedicatedPhoneNumber) return false
  return phonesMatch(line.userPhone, callerPhone)
}

export function createAgentLine(input: {
  userId: string
  userPhone: string
  agentName?: string
  displayName?: string
  workspaceName?: string
  ownerEmail?: string
  agentRole?: AgentRole
  allowedCallerPhones?: string[]
}): AgentLine {
  const lines = loadLines()
  const existing = lines.find((line) => line.userId === input.userId)
  if (existing) {
    existing.userPhone = input.userPhone.trim()
    if (input.agentName?.trim()) existing.agentName = input.agentName.trim()
    if (input.displayName?.trim()) existing.displayName = input.displayName.trim()
    if (input.workspaceName?.trim()) existing.workspaceName = input.workspaceName.trim()
    if (input.ownerEmail?.trim()) existing.ownerEmail = input.ownerEmail.trim()
    if (input.agentRole) existing.agentRole = input.agentRole
    if (input.allowedCallerPhones) existing.allowedCallerPhones = input.allowedCallerPhones
    saveLines(lines)
    return existing
  }

  const line: AgentLine = {
    lineId: randomLineId(),
    userId: input.userId,
    userPhone: input.userPhone.trim(),
    pin: randomPin(),
    agentName: input.agentName?.trim(),
    displayName: input.displayName?.trim(),
    workspaceName: input.workspaceName?.trim(),
    ownerEmail: input.ownerEmail?.trim(),
    agentRole: input.agentRole ?? "executive",
    allowedCallerPhones: input.allowedCallerPhones ?? [],
    whatsappStatus: "none",
    createdAt: new Date().toISOString(),
  }
  lines.push(line)
  saveLines(lines)
  return line
}

export function setTelephonyLine(
  userId: string,
  update: {
    dedicatedPhoneNumber: string
    telephonyProvider: "agentphone" | "twilio"
    twilioPhoneSid?: string
    agentPhoneAgentId?: string
    agentPhoneNumberId?: string
    whatsappStatus: WhatsAppStatus
  },
): AgentLine {
  const lines = loadLines()
  const line = lines.find((l) => l.userId === userId)
  if (!line) {
    throw new Error("Agent line not found")
  }
  line.dedicatedPhoneNumber = update.dedicatedPhoneNumber
  line.telephonyProvider = update.telephonyProvider
  line.twilioPhoneSid = update.twilioPhoneSid
  line.agentPhoneAgentId = update.agentPhoneAgentId
  line.agentPhoneNumberId = update.agentPhoneNumberId
  line.whatsappStatus = update.whatsappStatus
  saveLines(lines)
  return line
}

/** @deprecated use setTelephonyLine */
export function setDedicatedNumber(
  userId: string,
  update: {
    dedicatedPhoneNumber: string
    twilioPhoneSid: string
    whatsappStatus: WhatsAppStatus
  },
): AgentLine {
  return setTelephonyLine(userId, {
    ...update,
    telephonyProvider: "twilio",
  })
}

export function getLineByAgentPhoneId(agentId: string): AgentLine | undefined {
  return loadLines().find((line) => line.agentPhoneAgentId === agentId)
}

export function resolveAgentUserId(options: {
  userIdParam?: string | null
  callerPhone?: string
  calledNumber?: string
  pin?: string | null
  requireCallerAccess?: boolean
}): string | null {
  if (options.userIdParam?.trim()) return options.userIdParam.trim()

  if (options.calledNumber) {
    const byDedicated = getLineByDedicatedNumber(options.calledNumber)
    if (byDedicated) {
      if (
        options.requireCallerAccess !== false &&
        !isInboundCallerAllowed(byDedicated, options.callerPhone, true)
      ) {
        return null
      }
      return byDedicated.userId
    }
  }

  if (options.pin?.trim()) {
    const byPin = getLineByPin(options.pin.trim())
    if (byPin) return byPin.userId
  }

  if (options.callerPhone) {
    const byPhone = getLineByPhone(options.callerPhone)
    if (byPhone) return byPhone.userId
  }

  return null
}
