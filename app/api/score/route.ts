import { NextResponse } from "next/server"

import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_REGION_ID,
  getLanguage,
  getRegion,
  isLanguageId,
  isRegionId,
} from "@/lib/languages"
import { buildCharacterPrompt } from "@/lib/prompts"
import { resolveScenario, type Scenario } from "@/lib/character"
import { moderateLiveTurn } from "@/lib/content-safety"
import { pronunciationScoreJsonSchema } from "@/lib/score-schema"
import { createScoreNdjsonStream } from "@/lib/score-stream"
import { requireCurrentUser } from "@/lib/supabase"
import type { ConversationTurn } from "@/lib/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"
const UPSTREAM_TIMEOUT_MS = 90_000

// Long streams on serverless deploys.
export const maxDuration = 60

export async function POST(request: Request) {
  const auth = await requireCurrentUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 }
    )
  }

  let body: {
    audioBase64?: string
    audioFormat?: string
    phrase?: string
    language?: string
    languageId?: string
    regionId?: string
    scenarioId?: string
    history?: ConversationTurn[]
    characterGender?: "male" | "female"
    currentMeter?: number
    customScenario?: Scenario
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    audioBase64,
    audioFormat,
    phrase,
    language,
    languageId: rawLanguageId,
    regionId: rawRegionId,
    scenarioId = "teacher",
    history = [],
    characterGender = "female",
    currentMeter = 0,
    customScenario,
  } = body

  const languageId =
    rawLanguageId && isLanguageId(rawLanguageId)
      ? rawLanguageId
      : language === "English"
        ? "en"
        : language === "Spanish"
          ? "es"
          : language === "Russian"
            ? "ru"
            : DEFAULT_LANGUAGE_ID

  const regionId =
    rawRegionId && isRegionId(rawRegionId) ? rawRegionId : DEFAULT_REGION_ID

  if (!audioBase64 || !audioFormat) {
    return NextResponse.json(
      { error: "audioBase64 and audioFormat are required" },
      { status: 400 }
    )
  }

  if (!scenarioId || typeof scenarioId !== "string") {
    return NextResponse.json({ error: "Invalid scenarioId" }, { status: 400 })
  }

  if (!customScenario) {
    return NextResponse.json(
      { error: "customScenario is required" },
      { status: 400 }
    )
  }

  let scenario: Scenario
  try {
    scenario = resolveScenario(scenarioId, customScenario)
  } catch {
    return NextResponse.json(
      { error: "Invalid custom scenario" },
      { status: 400 }
    )
  }

  const cappedHistory = history.slice(-12)

  const languageDef = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  const prompt = buildCharacterPrompt({
    scenario,
    characterGender,
    history: cappedHistory,
    currentMeter,
    phrase,
    languageName: languageDef.name,
    region,
  })

  try {
    const upstreamAbort = new AbortController()
    const timeout = setTimeout(
      () => upstreamAbort.abort(),
      UPSTREAM_TIMEOUT_MS,
    )

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: upstreamAbort.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Parler Bien",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: audioFormat,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pronunciation_score",
            strict: true,
            schema: pronunciationScoreJsonSchema,
          },
        },
      }),
    })

    if (!response.ok || !response.body) {
      clearTimeout(timeout)
      const errorText = await response.text().catch(() => "")
      console.error("OpenRouter error:", errorText)
      return NextResponse.json(
        { error: "Failed to score pronunciation" },
        { status: 502 }
      )
    }

    // From here on the status is committed to 200; failures go in-band
    // as {"type":"error"} NDJSON lines.
    const stream = createScoreNdjsonStream(response.body, {
      onClose: () => {
        clearTimeout(timeout)
        upstreamAbort.abort()
      },
      moderate: (turn) =>
        moderateLiveTurn(apiKey, {
          userText: turn.transcript,
          replyText: turn.replyText,
          languageName: languageDef.name,
        }),
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error("Score route error:", error)
    return NextResponse.json(
      { error: "Failed to process pronunciation score" },
      { status: 500 }
    )
  }
}
