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
import { pronunciationScoreJsonSchema } from "@/lib/score-schema"
import { requireCurrentUser } from "@/lib/supabase"
import type {
  ConversationTurn,
  PronunciationScore,
} from "@/lib/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

function parseScore(content: string): PronunciationScore {
  const parsed = JSON.parse(content) as PronunciationScore

  if (
    typeof parsed.overall_score !== "number" ||
    typeof parsed.coaching !== "string" ||
    typeof parsed.transcript !== "string" ||
    !parsed.reply ||
    typeof parsed.reply.text !== "string" ||
    typeof parsed.reply.tts_text !== "string" ||
    typeof parsed.reply.hint !== "string" ||
    typeof parsed.meter !== "number" ||
    typeof parsed.goal_achieved !== "boolean" ||
    !Array.isArray(parsed.words) ||
    !Array.isArray(parsed.next_sentences) ||
    !parsed.speaker ||
    typeof parsed.speaker.accent !== "string" ||
    typeof parsed.speaker.age_range !== "string" ||
    typeof parsed.speaker.gender !== "string" ||
    typeof parsed.speaker.notes !== "string"
  ) {
    throw new Error("Invalid score response shape")
  }

  return parsed
}

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
    scenarioId = "vendor",
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
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Parler Bien",
      },
      body: JSON.stringify({
        model: MODEL,
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenRouter error:", errorText)
      return NextResponse.json(
        { error: "Failed to score pronunciation" },
        { status: 502 }
      )
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 502 }
      )
    }

    const score = parseScore(content)

    return NextResponse.json(score)
  } catch (error) {
    console.error("Score route error:", error)
    return NextResponse.json(
      { error: "Failed to process pronunciation score" },
      { status: 500 }
    )
  }
}
