import { randomUUID } from "crypto"

import { NextResponse } from "next/server"

import { requireCurrentUser } from "@/lib/supabase"
import {
  getLanguage,
  getRegion,
  isLanguageId,
  isRegionId,
  type LanguageId,
} from "@/lib/languages"
import {
  generatedScenarioJsonSchema,
  type GeneratedScenarioPayload,
} from "@/lib/scenario-generate-schema"
import type { Scenario } from "@/lib/scenarios"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

const MAX_TEXT_CHARS = 24_000
const MAX_PDF_BYTES = 4 * 1024 * 1024

type SourceType = "prompt" | "text" | "pdf"

function buildInstructions(
  languageName: string,
  regionLabel: string,
  city: string
) {
  return `Create a language-learning roleplay scenario for practicing ${languageName} (${regionLabel}, ${city}).

The scenario must:
- Have a clear win condition tracked by a 0-100 meter
- Include persona text with {characterGender} placeholder, character age, short spoken lines only, meter rules, goal_achieved at meter >= 90, and instruction to score pronunciation
- openingLine.text and all starters must be in ${languageName}
- hints are short English glosses
- Be appropriate for language practice (no explicit content)
- Feel specific and fun, inspired by the user's source material when provided`
}

function parseGenerated(content: string): GeneratedScenarioPayload {
  const parsed = JSON.parse(content) as GeneratedScenarioPayload

  if (
    typeof parsed.title !== "string" ||
    typeof parsed.tagline !== "string" ||
    typeof parsed.goal !== "string" ||
    typeof parsed.meterLabel !== "string" ||
    typeof parsed.winMessage !== "string" ||
    typeof parsed.persona !== "string" ||
    !parsed.voice ||
    typeof parsed.voice.ageRange !== "string" ||
    typeof parsed.voice.tone !== "string" ||
    !parsed.openingLine ||
    typeof parsed.openingLine.text !== "string" ||
    typeof parsed.openingLine.hint !== "string" ||
    !Array.isArray(parsed.starters) ||
    parsed.starters.length < 3 ||
    typeof parsed.imagePrompt !== "string"
  ) {
    throw new Error("Invalid generated scenario shape")
  }

  return parsed
}

function toScenario(
  payload: GeneratedScenarioPayload,
  languageId: LanguageId,
  sourceLabel?: string
): Scenario {
  const id = `custom:${randomUUID()}` as const

  return {
    id,
    title: payload.title.trim(),
    tagline: payload.tagline.trim(),
    goal: payload.goal.trim(),
    meterLabel: payload.meterLabel.trim(),
    winMessage: payload.winMessage.trim(),
    persona: payload.persona.trim(),
    voice: payload.voice,
    content: {
      [languageId]: {
        openingLine: payload.openingLine,
        starters: payload.starters.slice(0, 3),
      },
    },
    imagePrompt: payload.imagePrompt.trim(),
    primaryLanguageId: languageId,
    createdAt: Date.now(),
    sourceLabel: sourceLabel?.trim() || undefined,
  }
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
    languageId?: string
    regionId?: string
    sourceType?: SourceType
    prompt?: string
    fileBase64?: string
    fileName?: string
    sourceLabel?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    languageId: rawLanguageId,
    regionId: rawRegionId,
    sourceType = "prompt",
    prompt,
    fileBase64,
    fileName,
    sourceLabel,
  } = body

  if (!rawLanguageId || !isLanguageId(rawLanguageId)) {
    return NextResponse.json(
      { error: "Valid languageId is required" },
      { status: 400 }
    )
  }

  const languageId = rawLanguageId
  const regionId =
    rawRegionId && isRegionId(rawRegionId)
      ? rawRegionId
      : getLanguage(languageId).regions[0].id

  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  const trimmedPrompt = prompt?.trim() ?? ""
  const hasPdf = sourceType === "pdf" && !!fileBase64
  const hasTextUpload = sourceType === "text" && !!trimmedPrompt

  if (sourceType === "prompt" && !trimmedPrompt) {
    return NextResponse.json(
      { error: "Describe the scenario you want to practice" },
      { status: 400 }
    )
  }

  if (sourceType === "pdf" && !fileBase64) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 })
  }

  if (sourceType === "text" && !trimmedPrompt) {
    return NextResponse.json(
      { error: "Uploaded text is empty" },
      { status: 400 }
    )
  }

  if (hasTextUpload && trimmedPrompt.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: `Text uploads must be under ${MAX_TEXT_CHARS} characters` },
      { status: 400 }
    )
  }

  if (hasPdf) {
    const byteLength = Buffer.from(fileBase64!, "base64").byteLength
    if (byteLength > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "PDF must be under 4 MB" },
        { status: 400 }
      )
    }
  }

  const instructions = buildInstructions(
    language.name,
    region.label,
    region.city
  )

  const sourceDescription =
    sourceType === "prompt"
      ? `User prompt:\n${trimmedPrompt}`
      : sourceType === "text"
        ? `Course or document text:\n${trimmedPrompt.slice(0, MAX_TEXT_CHARS)}`
        : `Use the attached PDF (${fileName ?? "document.pdf"}) as source material for vocabulary, setting, characters, and goals.`

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "file"; file: { filename: string; file_data: string } }
  > = [
    {
      type: "text",
      text: `${instructions}\n\n${sourceDescription}`,
    },
  ]

  if (hasPdf) {
    userContent.push({
      type: "file",
      file: {
        filename: fileName ?? "course.pdf",
        file_data: `data:application/pdf;base64,${fileBase64}`,
      },
    })
  }

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
        messages: [{ role: "user", content: userContent }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "generated_scenario",
            strict: true,
            schema: generatedScenarioJsonSchema,
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Scenario generate error:", errorText)
      return NextResponse.json(
        { error: "Failed to generate scenario" },
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

    const payload = parseGenerated(content)
    const scenario = toScenario(
      payload,
      languageId,
      sourceLabel ??
        fileName ??
        (sourceType === "prompt" ? "Custom prompt" : undefined)
    )

    return NextResponse.json({ scenario })
  } catch (error) {
    console.error("Scenario generate route error:", error)
    return NextResponse.json(
      { error: "Failed to process scenario generation" },
      { status: 500 }
    )
  }
}
