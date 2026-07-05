import { describe, expect, test } from "bun:test"

import { parseScore } from "./score-schema"
import {
  createScoreNdjsonStream,
  extractCompleteTopLevelValues,
  readScoreStream,
  sseContentDeltas,
  tryExtractReplyEvent,
  type ScoreStreamEvent,
} from "./score-stream"

const FULL_SCORE = {
  overall_score: 87,
  coaching: "Round your lips more on the u sound.",
  transcript: 'il a dit "salut" hier',
  reply: {
    text: "Bonjour ! Vous cherchez quelque chose ?",
    tts_text: "[warmly] Bonjour ! Vous cherchez quelque chose ?",
    hint: "Hello! Looking for something?",
  },
  speaker: {
    accent: "American English",
    age_range: "25-35",
    gender: "male" as const,
    notes: "Slight hesitation on vowels",
  },
  meter: 42,
  goal_achieved: false,
  words: [
    { word: "il", score: 95, issue: null, tip: null },
    { word: "salut", score: 62, issue: "flat u", tip: "Round your lips" },
  ],
  next_sentences: [
    { text: "Je cherche un cadeau.", hint: "I'm looking for a gift." },
    { text: "C'est combien ?", hint: "How much is it?" },
    { text: "Merci beaucoup.", hint: "Thanks a lot." },
  ],
}

const FULL_DOC = JSON.stringify(FULL_SCORE)

function chunkedStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

function sseBody(deltas: string[], options?: { withDone?: boolean }): string {
  const lines = deltas.map(
    (content) =>
      `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
  )
  if (options?.withDone !== false) lines.push("data: [DONE]\n\n")
  return lines.join("")
}

async function collectEvents(
  stream: ReadableStream<Uint8Array>,
): Promise<ScoreStreamEvent[]> {
  const events: ScoreStreamEvent[] = []
  await readScoreStream(stream, (event) => events.push(event))
  return events
}

describe("extractCompleteTopLevelValues", () => {
  test("empty buffer and missing brace return nothing", () => {
    expect(extractCompleteTopLevelValues("")).toEqual({})
    expect(extractCompleteTopLevelValues("data")).toEqual({})
  })

  test("truncated key returns nothing", () => {
    expect(extractCompleteTopLevelValues('{"overall_sc')).toEqual({})
  })

  test("keeps complete values, stops at the truncated one", () => {
    const out = extractCompleteTopLevelValues(
      '{"overall_score": 87, "coaching": "Nice wor',
    )
    expect(out).toEqual({ overall_score: 87 })
  })

  test("trailing number without delimiter is incomplete", () => {
    expect(extractCompleteTopLevelValues('{"overall_score": 87')).toEqual({})
    expect(
      extractCompleteTopLevelValues('{"overall_score": 87,'),
    ).toEqual({ overall_score: 87 })
  })

  test("half-complete nested object is not extracted", () => {
    const out = extractCompleteTopLevelValues(
      '{"reply": {"text": "Bonjour", "tts_text": "Bon',
    )
    expect(out).toEqual({})
  })

  test("complete object survives a truncated following key", () => {
    const out = extractCompleteTopLevelValues(
      `{"reply": ${JSON.stringify(FULL_SCORE.reply)}, "spea`,
    )
    expect(out.reply).toEqual(FULL_SCORE.reply)
  })

  test("escaped quotes stay inside the string", () => {
    const out = extractCompleteTopLevelValues(
      '{"transcript": "il a dit \\"salut\\" hier"}',
    )
    expect(out.transcript).toBe('il a dit "salut" hier')
  })

  test("escaped backslash before closing quote closes correctly", () => {
    const out = extractCompleteTopLevelValues(
      '{"transcript": "chemin \\\\", "meter": 5,',
    )
    expect(out.transcript).toBe("chemin \\")
    expect(out.meter).toBe(5)
  })

  test("braces and colons inside strings do not affect depth", () => {
    const out = extractCompleteTopLevelValues(
      '{"reply": {"text": "then { he said: \\"go\\" }", "tts_text": "x", "hint": "y"}}',
    )
    expect(out.reply).toEqual({
      text: 'then { he said: "go" }',
      tts_text: "x",
      hint: "y",
    })
  })

  test("key-lookalike text inside a truncated string is not a key", () => {
    const out = extractCompleteTopLevelValues(
      '{"transcript": "tricky text with \\"speaker\\": inside',
    )
    expect(out).toEqual({})
  })

  test("arrays with nested objects round-trip", () => {
    const out = extractCompleteTopLevelValues(
      `{"words": ${JSON.stringify(FULL_SCORE.words)},`,
    )
    expect(out.words).toEqual(FULL_SCORE.words)
  })

  test("full document extracts every field", () => {
    const out = extractCompleteTopLevelValues(FULL_DOC)
    expect(out).toEqual(FULL_SCORE)
  })
})

describe("tryExtractReplyEvent", () => {
  test("null while any conversational field is incomplete", () => {
    const untilReply = FULL_DOC.slice(0, FULL_DOC.indexOf('"speaker"') + 12)
    expect(tryExtractReplyEvent(untilReply)).toBeNull()
  })

  test("fires while heavy arrays are still streaming", () => {
    const cutAt = FULL_DOC.indexOf('"words"') + 20
    const event = tryExtractReplyEvent(FULL_DOC.slice(0, cutAt))
    expect(event).toEqual({
      transcript: FULL_SCORE.transcript,
      reply: FULL_SCORE.reply,
      speaker: FULL_SCORE.speaker,
    })
  })

  test("order-independent: alphabetical document works", () => {
    const alphabetical = JSON.stringify(
      Object.fromEntries(
        Object.keys(FULL_SCORE)
          .sort()
          .map((key) => [key, FULL_SCORE[key as keyof typeof FULL_SCORE]]),
      ),
    )
    const cutAt = alphabetical.indexOf('"words"')
    const event = tryExtractReplyEvent(alphabetical.slice(0, cutAt))
    expect(event?.reply).toEqual(FULL_SCORE.reply)
    expect(event?.speaker).toEqual(FULL_SCORE.speaker)
    expect(event?.transcript).toBe(FULL_SCORE.transcript)
  })
})

describe("sseContentDeltas", () => {
  async function collect(chunks: string[]): Promise<string[]> {
    const out: string[] = []
    for await (const delta of sseContentDeltas(chunkedStream(chunks))) {
      out.push(delta)
    }
    return out
  }

  test("reassembles deltas split mid-line across chunks", async () => {
    const body = sseBody(["Hello", " world"])
    const splitAt = body.indexOf("Hello") + 3
    const deltas = await collect([body.slice(0, splitAt), body.slice(splitAt)])
    expect(deltas.join("")).toBe("Hello world")
  })

  test("ignores comment keepalives", async () => {
    const body = `: OPENROUTER PROCESSING\n\n${sseBody(["Hi"])}`
    expect(await collect([body])).toEqual(["Hi"])
  })

  test("[DONE] terminates the stream", async () => {
    const body = sseBody(["A"]) + sseBody(["never"], { withDone: false })
    expect(await collect([body])).toEqual(["A"])
  })

  test("error frames throw", async () => {
    const body = `data: ${JSON.stringify({ error: { message: "boom" } })}\n\n`
    await expect(collect([body])).rejects.toThrow("boom")
  })
})

describe("createScoreNdjsonStream", () => {
  test("many deltas emit reply then score", async () => {
    const deltas = FULL_DOC.match(/.{1,20}/g) ?? []
    const events = await collectEvents(
      createScoreNdjsonStream(chunkedStream([sseBody(deltas)])),
    )
    expect(events.map((e) => e.type)).toEqual(["reply", "score"])
    const reply = events[0] as Extract<ScoreStreamEvent, { type: "reply" }>
    expect(reply.reply).toEqual(FULL_SCORE.reply)
    expect(reply.speaker).toEqual(FULL_SCORE.speaker)
    const score = events[1] as Extract<ScoreStreamEvent, { type: "score" }>
    expect(score.score).toEqual(parseScore(FULL_DOC))
  })

  test("single-chunk document degrades to reply then score in one pass", async () => {
    const events = await collectEvents(
      createScoreNdjsonStream(chunkedStream([sseBody([FULL_DOC])])),
    )
    expect(events.map((e) => e.type)).toEqual(["reply", "score"])
  })

  test("truncated upstream ends with an error event", async () => {
    const truncated = FULL_DOC.slice(0, FULL_DOC.indexOf('"words"'))
    const events = await collectEvents(
      createScoreNdjsonStream(chunkedStream([sseBody([truncated])])),
    )
    expect(events.at(-1)?.type).toBe("error")
    expect(events.map((e) => e.type)).toEqual(["reply", "error"])
  })

  test("unsafe verdict emits moderation after score", async () => {
    const deltas = FULL_DOC.match(/.{1,20}/g) ?? []
    const events = await collectEvents(
      createScoreNdjsonStream(chunkedStream([sseBody(deltas)]), {
        moderate: async () => ({ userSafe: false, responseSafe: true }),
      }),
    )
    expect(events.map((e) => e.type)).toEqual(["reply", "score", "moderation"])
    expect(events.at(-1)).toEqual({
      type: "moderation",
      userSafe: false,
      responseSafe: true,
    })
  })

  test("safe verdict emits no moderation event", async () => {
    const events = await collectEvents(
      createScoreNdjsonStream(chunkedStream([sseBody([FULL_DOC])]), {
        moderate: async () => ({ userSafe: true, responseSafe: true }),
      }),
    )
    expect(events.map((e) => e.type)).toEqual(["reply", "score"])
  })

  test("moderation rejection fails open", async () => {
    const events = await collectEvents(
      createScoreNdjsonStream(chunkedStream([sseBody([FULL_DOC])]), {
        moderate: async () => {
          throw new Error("moderation down")
        },
      }),
    )
    expect(events.map((e) => e.type)).toEqual(["reply", "score"])
  })

  test("moderation receives the turn text and runs concurrently", async () => {
    const calls: Array<{ transcript: string; replyText: string }> = []
    let resolveVerdict!: (v: {
      userSafe: boolean
      responseSafe: boolean
    }) => void
    const types: string[] = []
    const deltas = FULL_DOC.match(/.{1,20}/g) ?? []
    const reader = createScoreNdjsonStream(chunkedStream([sseBody(deltas)]), {
      moderate: (turn) => {
        calls.push(turn)
        return new Promise((resolve) => {
          resolveVerdict = resolve
        })
      },
    }).getReader()

    const decoder = new TextDecoder()
    let pending = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })
      const lines = pending.split("\n")
      pending = lines.pop() ?? ""
      for (const line of lines) {
        if (!line.trim()) continue
        const event = JSON.parse(line) as ScoreStreamEvent
        types.push(event.type)
        // Score must arrive while the verdict is still unresolved —
        // moderation never blocks the score event.
        if (event.type === "score") {
          expect(types).toEqual(["reply", "score"])
          resolveVerdict({ userSafe: false, responseSafe: false })
        }
      }
    }
    expect(types).toEqual(["reply", "score", "moderation"])
    expect(calls).toEqual([
      {
        transcript: FULL_SCORE.transcript,
        replyText: FULL_SCORE.reply.text,
      },
    ])
  })

  test("single-chunk stream still emits the moderation flag", async () => {
    const calls: Array<{ transcript: string; replyText: string }> = []
    const events = await collectEvents(
      createScoreNdjsonStream(chunkedStream([sseBody([FULL_DOC])]), {
        moderate: async (turn) => {
          calls.push(turn)
          return { userSafe: false, responseSafe: true }
        },
      }),
    )
    expect(events.at(-1)?.type).toBe("moderation")
    expect(calls).toEqual([
      {
        transcript: FULL_SCORE.transcript,
        replyText: FULL_SCORE.reply.text,
      },
    ])
  })
})

describe("readScoreStream", () => {
  test("handles lines split across chunk boundaries and no trailing newline", async () => {
    const line1 = JSON.stringify({ type: "reply", ...{
      transcript: FULL_SCORE.transcript,
      reply: FULL_SCORE.reply,
      speaker: FULL_SCORE.speaker,
    } })
    const line2 = JSON.stringify({ type: "score", score: FULL_SCORE })
    const body = `${line1}\n\n${line2}`
    const splitAt = Math.floor(line1.length / 2)
    const events: ScoreStreamEvent[] = []
    await readScoreStream(
      chunkedStream([body.slice(0, splitAt), body.slice(splitAt)]),
      (event) => events.push(event),
    )
    expect(events.map((e) => e.type)).toEqual(["reply", "score"])
  })
})

describe("parseScore", () => {
  test("valid document parses", () => {
    expect(parseScore(FULL_DOC)).toEqual(FULL_SCORE)
  })

  test("missing speaker throws", () => {
    const rest = Object.fromEntries(
      Object.entries(FULL_SCORE).filter(([key]) => key !== "speaker"),
    )
    expect(() => parseScore(JSON.stringify(rest))).toThrow(
      "Invalid score response shape",
    )
  })
})
