import { NextResponse } from "next/server"

import {
  getLanguage,
  getRegion,
  isLanguageId,
  isRegionId,
  type LanguageId,
} from "@/lib/languages"
import {
  generatedWorkspaceJsonSchema,
  type GeneratedWorkspacePayload,
} from "@/lib/workspace-generate-schema"
import { requireCurrentUser } from "@/lib/supabase"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

const MAX_TEXT_CHARS = 24_000
const MAX_PDF_BYTES = 4 * 1024 * 1024

type SourceType = "prompt" | "text" | "pdf"

function buildInstructions(languageName: string, regionLabel: string, city: string) {
  return `Design a complete company training workspace for practicing ${languageName} (${regionLabel}, ${city}).

Return a full program with:
- workspace metadata (name, description, companyName, themeColor)
- contextSummary: extracted training guidelines from the source material
- 1-4 personas with full agent config (key, name, roleTitle, tagline, agentType, capabilities, voice fields, skills, previewScript, personaBase with 0-100 meter rules and concede at 90+, avatarPrompt, greeting, themeColor)
- 2-4 tracks, each linked to a personaKey, with 2-5 ordered levels of escalating difficulty
- passCriteriaType per level: "goal", "pronunciation" (include minScore), or "complete" (include minTurns). Do NOT use gesture criteria.
- Each level needs room fields: targetPhrase, openingLineText+openingLineHint, goal, meterLabel, winMessage, starters (text+hint), customPersonaOverlay when useful
- All learner-facing lines (openingLineText, starters, targetPhrase) must be in ${languageName}
- Hints are short English glosses
- Personas must never quote scripts verbatim; coach through natural dialogue
- Be specific to the source material when provided`
}

function parseGenerated(content: string): GeneratedWorkspacePayload {
  const parsed = JSON.parse(content) as GeneratedWorkspacePayload

  if (
    !parsed.workspace ||
    typeof parsed.workspace.name !== "string" ||
    typeof parsed.workspace.description !== "string" ||
    typeof parsed.workspace.companyName !== "string" ||
    typeof parsed.workspace.themeColor !== "string" ||
    typeof parsed.contextSummary !== "string" ||
    !Array.isArray(parsed.personas) ||
    parsed.personas.length < 1 ||
    !Array.isArray(parsed.tracks) ||
    parsed.tracks.length < 1
  ) {
    throw new Error("Invalid generated workspace shape")
  }

  for (const persona of parsed.personas) {
    if (typeof persona.key !== "string" || typeof persona.personaBase !== "string") {
      throw new Error("Invalid persona in generated workspace")
    }
  }

  for (const track of parsed.tracks) {
    if (
      typeof track.personaKey !== "string" ||
      !Array.isArray(track.levels) ||
      track.levels.length < 2
    ) {
      throw new Error("Invalid track in generated workspace")
    }
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
      { status: 500 },
    )
  }

  let body: {
    languageId?: string
    regionId?: string
    sourceType?: SourceType
    prompt?: string
    fileBase64?: string
    fileName?: string
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
  } = body

  if (!rawLanguageId || !isLanguageId(rawLanguageId)) {
    return NextResponse.json({ error: "Valid languageId is required" }, { status: 400 })
  }

  const languageId = rawLanguageId as LanguageId
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
      { error: "Describe the training program you want to build" },
      { status: 400 },
    )
  }

  if (sourceType === "pdf" && !fileBase64) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 })
  }

  if (sourceType === "text" && !trimmedPrompt) {
    return NextResponse.json({ error: "Uploaded text is empty" }, { status: 400 })
  }

  if (hasTextUpload && trimmedPrompt.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: `Text uploads must be under ${MAX_TEXT_CHARS} characters` },
      { status: 400 },
    )
  }

  if (hasPdf) {
    const byteLength = Buffer.from(fileBase64!, "base64").byteLength
    if (byteLength > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF must be under 4 MB" }, { status: 400 })
    }
  }

  const instructions = buildInstructions(language.name, region.label, region.city)

  const sourceDescription =
    sourceType === "prompt"
      ? `User prompt:\n${trimmedPrompt}`
      : sourceType === "text"
        ? `Training document text:\n${trimmedPrompt.slice(0, MAX_TEXT_CHARS)}`
        : `Use the attached PDF (${fileName ?? "document.pdf"}) as source material for company guidelines, personas, scenarios, and level goals.${trimmedPrompt ? `\n\nAdditional notes:\n${trimmedPrompt}` : ""}`

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
        filename: fileName ?? "training.pdf",
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
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Parler Bien",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: userContent }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "generated_workspace",
            strict: true,
            schema: generatedWorkspaceJsonSchema,
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Workspace generate error:", errorText)
      return NextResponse.json({ error: "Failed to generate workspace" }, { status: 502 })
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 502 })
    }

    const payload = parseGenerated(content)
    return NextResponse.json({ workspace: payload, languageId, regionId })
  } catch (error) {
    console.error("Workspace generate route error:", error)
    return NextResponse.json(
      { error: "Failed to process workspace generation" },
      { status: 500 },
    )
  }
}
