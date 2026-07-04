import { randomInt } from "crypto"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"

export type AgentLine = {
  lineId: string
  userId: string
  userPhone: string
  pin: string
  displayName?: string
  createdAt: string
}

const STORE_PATH = join(process.cwd(), ".data", "agent-lines.json")

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  return digits.startsWith("0") ? digits : digits
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

export function getLineByUserId(userId: string): AgentLine | undefined {
  return loadLines().find((line) => line.userId === userId)
}

export function getLineByPin(pin: string): AgentLine | undefined {
  return loadLines().find((line) => line.pin === pin.trim())
}

export function getLineByPhone(phone: string): AgentLine | undefined {
  const normalized = normalizePhone(phone)
  if (!normalized) return undefined
  return loadLines().find((line) => {
    const lineDigits = normalizePhone(line.userPhone)
    return lineDigits === normalized || lineDigits.endsWith(normalized.slice(-9))
  })
}

export function createAgentLine(input: {
  userId: string
  userPhone: string
  displayName?: string
}): AgentLine {
  const lines = loadLines()
  const existing = lines.find((line) => line.userId === input.userId)
  if (existing) {
    existing.userPhone = input.userPhone.trim()
    if (input.displayName?.trim()) existing.displayName = input.displayName.trim()
    saveLines(lines)
    return existing
  }

  const line: AgentLine = {
    lineId: randomLineId(),
    userId: input.userId,
    userPhone: input.userPhone.trim(),
    pin: randomPin(),
    displayName: input.displayName?.trim(),
    createdAt: new Date().toISOString(),
  }
  lines.push(line)
  saveLines(lines)
  return line
}

export function resolveAgentUserId(options: {
  userIdParam?: string | null
  callerPhone?: string
  pin?: string | null
}): string | null {
  if (options.userIdParam?.trim()) return options.userIdParam.trim()

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
