import { randomUUID } from "crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

export type UsageChannel =
  | "browser_chat"
  | "browser_voice_stt"
  | "browser_voice_agent"
  | "browser_tts"
  | "phone_voice"
  | "phone_sms"
  | "telephony"

export type UsageEvent = {
  id: string
  userId: string
  channel: UsageChannel
  label: string
  costUsd: number
  promptTokens?: number
  completionTokens?: number
  at: string
}

export type OpenRouterUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost?: number
}

/** Rough OpenRouter rates when `usage.cost` is missing (USD per token). */
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "google/gemini-3.5-flash": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
  default: { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
}

const TTS_USD_PER_CHAR = 0.000015
const PHONE_VOICE_TELEPHONY_USD = 0.04
const PHONE_SMS_TELEPHONY_USD = 0.008

const STORE_PATH = join(process.cwd(), ".data", "agent-usage.json")
const MAX_EVENTS_PER_USER = 500

type UsageStore = Record<string, UsageEvent[]>

function loadStore(): UsageStore {
  try {
    if (!existsSync(STORE_PATH)) return {}
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as UsageStore
  } catch {
    return {}
  }
}

function saveStore(store: UsageStore): void {
  mkdirSync(join(process.cwd(), ".data"), { recursive: true })
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2))
}

export function costFromOpenRouterUsage(
  usage: OpenRouterUsage | undefined,
  model = "google/gemini-3.5-flash",
): { costUsd: number; promptTokens: number; completionTokens: number } {
  const promptTokens = usage?.prompt_tokens ?? 0
  const completionTokens = usage?.completion_tokens ?? 0
  if (usage?.cost != null && usage.cost >= 0) {
    return { costUsd: usage.cost, promptTokens, completionTokens }
  }
  const rates = MODEL_RATES[model] ?? MODEL_RATES.default
  const costUsd = promptTokens * rates.input + completionTokens * rates.output
  return { costUsd, promptTokens, completionTokens }
}

export function estimateTtsCostUsd(text: string): number {
  return Math.max(0.0005, text.trim().length * TTS_USD_PER_CHAR)
}

export function recordAgentUsage(input: {
  userId: string
  channel: UsageChannel
  label: string
  costUsd: number
  promptTokens?: number
  completionTokens?: number
}): UsageEvent {
  const store = loadStore()
  const events = store[input.userId] ?? []
  const event: UsageEvent = {
    id: randomUUID(),
    userId: input.userId,
    channel: input.channel,
    label: input.label,
    costUsd: roundUsd(input.costUsd),
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    at: new Date().toISOString(),
  }
  events.push(event)
  store[input.userId] = events.slice(-MAX_EVENTS_PER_USER)
  saveStore(store)
  return event
}

export function recordOpenRouterUsage(input: {
  userId: string
  channel: UsageChannel
  label: string
  usage?: OpenRouterUsage
  model?: string
}): UsageEvent {
  const { costUsd, promptTokens, completionTokens } = costFromOpenRouterUsage(
    input.usage,
    input.model,
  )
  return recordAgentUsage({
    userId: input.userId,
    channel: input.channel,
    label: input.label,
    costUsd,
    promptTokens,
    completionTokens,
  })
}

export function recordPhoneTelephony(input: {
  userId: string
  channel: "phone_voice" | "phone_sms"
}): UsageEvent {
  return recordAgentUsage({
    userId: input.userId,
    channel: "telephony",
    label: input.channel === "phone_voice" ? "Phone call (line)" : "SMS (line)",
    costUsd: input.channel === "phone_voice" ? PHONE_VOICE_TELEPHONY_USD : PHONE_SMS_TELEPHONY_USD,
  })
}

function roundUsd(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000
}

function sumEvents(events: UsageEvent[]): number {
  return roundUsd(events.reduce((sum, e) => sum + e.costUsd, 0))
}

export function getUsageSummary(userId: string, sessionSince?: string): {
  totalUsd: number
  sessionUsd: number
  eventCount: number
  byChannel: Partial<Record<UsageChannel | "telephony", number>>
  recentEvents: UsageEvent[]
  estimates: {
    browserVoiceTurnUsd: number
    browserChatTurnUsd: number
    phoneVoiceTurnUsd: number
    phoneSmsUsd: number
  }
} {
  const all = loadStore()[userId] ?? []
  const sinceMs = sessionSince ? Date.parse(sessionSince) : NaN
  const sessionEvents =
    Number.isFinite(sinceMs) ? all.filter((e) => Date.parse(e.at) >= sinceMs) : all.slice(-20)

  const byChannel: Partial<Record<UsageChannel | "telephony", number>> = {}
  for (const event of all) {
    byChannel[event.channel] = roundUsd((byChannel[event.channel] ?? 0) + event.costUsd)
  }

  const voiceEvents = all.filter(
    (e) =>
      e.channel === "browser_voice_stt" ||
      e.channel === "browser_voice_agent" ||
      e.channel === "browser_tts",
  )
  const chatEvents = all.filter((e) => e.channel === "browser_chat")
  const phoneVoiceEvents = all.filter(
    (e) => e.channel === "phone_voice" || (e.channel === "telephony" && e.label.includes("call")),
  )
  const phoneSmsEvents = all.filter(
    (e) => e.channel === "phone_sms" || (e.channel === "telephony" && e.label.includes("SMS")),
  )

  const avg = (events: UsageEvent[], fallback: number) =>
    events.length ? sumEvents(events) / Math.max(1, events.length / 3) : fallback

  return {
    totalUsd: sumEvents(all),
    sessionUsd: sumEvents(sessionEvents),
    eventCount: all.length,
    byChannel,
    recentEvents: all.slice(-8).reverse(),
    estimates: {
      browserVoiceTurnUsd: roundUsd(
        avg(voiceEvents, 0.025) || 0.025,
      ),
      browserChatTurnUsd: roundUsd(avg(chatEvents, 0.008) || 0.008),
      phoneVoiceTurnUsd: roundUsd(
        (avg(phoneVoiceEvents, PHONE_VOICE_TELEPHONY_USD + 0.012) || 0.052),
      ),
      phoneSmsUsd: roundUsd(
        (avg(phoneSmsEvents, PHONE_SMS_TELEPHONY_USD + 0.006) || 0.014),
      ),
    },
  }
}

export function formatUsd(amount: number): string {
  if (amount < 0.01) return `$${amount.toFixed(4)}`
  if (amount < 1) return `$${amount.toFixed(3)}`
  return `$${amount.toFixed(2)}`
}
