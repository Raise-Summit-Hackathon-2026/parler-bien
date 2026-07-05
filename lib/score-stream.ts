import {
  isCharacterReply,
  isSpeakerProfile,
  parseScore,
} from "@/lib/score-schema"
import type {
  CharacterReply,
  PronunciationScore,
  SpeakerProfile,
} from "@/lib/types"

/**
 * Wire protocol for /api/score: NDJSON, one event per line.
 * "reply" fires as soon as the conversational fields are complete in the
 * model stream so speech can start early; "score" carries the full validated
 * payload; "error" is the in-band failure signal once streaming has begun.
 */
export type ScoreStreamEvent =
  | {
      type: "reply"
      transcript: string
      reply: CharacterReply
      speaker: SpeakerProfile
    }
  | { type: "score"; score: PronunciationScore }
  | { type: "moderation"; userSafe: boolean; responseSafe: boolean }
  | { type: "error"; error: string }

export type ModerateTurn = (turn: {
  transcript: string
  replyText: string
}) => Promise<{ userSafe: boolean; responseSafe: boolean } | null>

/** Index just past the closing quote, or -1 if the string is truncated. */
function scanString(s: string, start: number): number {
  let i = start + 1
  while (i < s.length) {
    if (s[i] === "\\") {
      i += 2
      continue
    }
    if (s[i] === '"') return i + 1
    i++
  }
  return -1
}

/** Index just past a complete JSON value, or -1 if truncated. */
function scanValue(s: string, start: number): number {
  const c = s[start]
  if (c === '"') return scanString(s, start)
  if (c === "{" || c === "[") {
    let depth = 0
    let i = start
    while (i < s.length) {
      const ch = s[i]
      if (ch === '"') {
        const end = scanString(s, i)
        if (end < 0) return -1
        i = end
        continue
      }
      if (ch === "{" || ch === "[") depth++
      else if (ch === "}" || ch === "]") {
        depth--
        if (depth === 0) return i + 1
      }
      i++
    }
    return -1
  }
  // number / true / false / null: complete only once a delimiter follows
  // (a buffer ending in `87` might continue as `875`).
  let i = start
  while (i < s.length && !/[,}\]\s]/.test(s[i])) i++
  return i < s.length ? i : -1
}

/**
 * Extract every top-level key whose value is already complete from a
 * truncated JSON object. Single forward scan; braces, colons, and
 * key-lookalike text inside string values can never be misdetected because
 * every quote routes through scanString.
 */
export function extractCompleteTopLevelValues(
  buffer: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  let i = buffer.indexOf("{")
  if (i < 0) return out
  i++
  const n = buffer.length
  while (i < n) {
    while (i < n && /[\s,]/.test(buffer[i])) i++
    if (i >= n || buffer[i] === "}") return out
    if (buffer[i] !== '"') return out
    const keyEnd = scanString(buffer, i)
    if (keyEnd < 0) return out
    let key: string
    try {
      key = JSON.parse(buffer.slice(i, keyEnd)) as string
    } catch {
      return out
    }
    i = keyEnd
    while (i < n && /\s/.test(buffer[i])) i++
    if (buffer[i] !== ":") return out
    i++
    while (i < n && /\s/.test(buffer[i])) i++
    if (i >= n) return out
    const valueEnd = scanValue(buffer, i)
    if (valueEnd < 0) return out
    try {
      out[key] = JSON.parse(buffer.slice(i, valueEnd))
    } catch {
      return out
    }
    i = valueEnd
  }
  return out
}

/** The reply-event payload once transcript, reply, and speaker are all complete. */
export function tryExtractReplyEvent(buffer: string): {
  transcript: string
  reply: CharacterReply
  speaker: SpeakerProfile
} | null {
  const values = extractCompleteTopLevelValues(buffer)
  if (
    typeof values.transcript === "string" &&
    isCharacterReply(values.reply) &&
    isSpeakerProfile(values.speaker)
  ) {
    return {
      transcript: values.transcript,
      reply: values.reply,
      speaker: values.speaker,
    }
  }
  return null
}

/** Parse an OpenAI-style SSE body into content delta strings. */
export async function* sseContentDeltas(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      pending += decoder.decode(value, { stream: true })
      const lines = pending.split("\n")
      pending = lines.pop() ?? ""
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith(":")) continue
        if (!line.startsWith("data:")) continue
        const payload = line.slice(5).trim()
        if (payload === "[DONE]") return
        const parsed = JSON.parse(payload) as {
          error?: { message?: string }
          choices?: Array<{ delta?: { content?: string } }>
        }
        if (parsed.error) {
          throw new Error(parsed.error.message ?? "Upstream stream error")
        }
        const content = parsed.choices?.[0]?.delta?.content
        if (typeof content === "string" && content) yield content
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Server side: pump an OpenRouter SSE body into a 2-event NDJSON stream.
 * Emits "reply" as soon as the conversational fields are extractable,
 * "score" once the full document validates. If early extraction never
 * fires, only "score" is emitted — exactly the pre-streaming latency.
 */
export function createScoreNdjsonStream(
  upstreamBody: ReadableStream<Uint8Array>,
  options?: {
    /** Called once when the stream ends — normal completion, failure, or client disconnect. */
    onClose?: () => void
    /**
     * Content moderation for the turn. Fired concurrently at the reply event
     * so it resolves during score generation; the verdict is emitted after
     * the score event, and only when flagged. Fail-open: a null result or a
     * rejection never surfaces as a stream error.
     */
    moderate?: ModerateTurn
  },
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ScoreStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
      let buffer = ""
      let replyEmitted = false
      let moderationPromise: ReturnType<ModerateTurn> | null = null
      const startedAt = Date.now()
      const beginModeration = (transcript: string, replyText: string) =>
        options?.moderate
          ? options.moderate({ transcript, replyText }).catch(() => null)
          : null
      try {
        for await (const delta of sseContentDeltas(upstreamBody)) {
          buffer += delta
          if (!replyEmitted) {
            const early = tryExtractReplyEvent(buffer)
            if (early) {
              emit({ type: "reply", ...early })
              replyEmitted = true
              moderationPromise ??= beginModeration(
                early.transcript,
                early.reply.text,
              )
              console.log(
                `[score-stream] reply event at ${Date.now() - startedAt}ms`,
              )
            }
          }
        }
        const score = parseScore(buffer)
        emit({ type: "score", score })
        console.log(
          `[score-stream] score event at ${Date.now() - startedAt}ms`,
        )
        // Degradation path: reply event never fired, so moderation starts here.
        moderationPromise ??= beginModeration(
          score.transcript,
          score.reply.text,
        )
        const verdict = await moderationPromise
        if (verdict && (!verdict.userSafe || !verdict.responseSafe)) {
          emit({ type: "moderation", ...verdict })
          console.log(
            `[score-stream] moderation flag at ${Date.now() - startedAt}ms`,
          )
        }
      } catch (error) {
        console.error("[score-stream] failed:", error)
        emit({ type: "error", error: "Failed to score pronunciation" })
      } finally {
        controller.close()
        options?.onClose?.()
      }
    },
    cancel() {
      options?.onClose?.()
    },
  })
}

/** Client side: read an NDJSON body and invoke onEvent per parsed line. */
export async function readScoreStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ScoreStreamEvent) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  const handleLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return
    onEvent(JSON.parse(trimmed) as ScoreStreamEvent)
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })
      const lines = pending.split("\n")
      pending = lines.pop() ?? ""
      for (const line of lines) handleLine(line)
    }
    handleLine(pending)
  } finally {
    reader.releaseLock()
  }
}
