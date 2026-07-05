import { NextResponse } from "next/server"

import {
  generationBlockedMessage,
  moderateGeneratedContent,
  scenarioTextForModeration,
} from "@/lib/content-safety"
import {
  buildGeneratedCharacterSchema,
  validateGeneratedCharacterPayload,
  type GeneratedCharacterPayload,
} from "@/lib/character-generate-schema"
import {
  formatLiveAvatarCatalogForPrompt,
  validateGeneratedLiveAvatarId,
} from "@/lib/liveavatar"
import {
  getLanguage,
  getRegion,
  isLanguageId,
  isRegionId,
} from "@/lib/languages"
import { requireCurrentUser, getSupabaseClientWithToken } from "@/lib/supabase"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

const MAX_TEXT_CHARS = 24_000
const MAX_PDF_BYTES = 4 * 1024 * 1024

type SourceType = "prompt" | "text" | "pdf"

function buildInstructions(
  languageName: string,
  regionLabel: string,
  city: string,
  levelCount: number,
  workspace?: { name: string; description: string | null },
) {
  const workspaceBlock = workspace
    ? `

WORKSPACE CONTEXT — this character is for a shared team workspace. Stay specific to this setting:
- Workspace name: ${workspace.name}${workspace.description ? `\n- About: ${workspace.description}` : ""}
- The scenario, roles, setting, and vocabulary must fit this workspace. Do not genericize.`
    : ""

  const trackBlock =
    levelCount > 1
      ? `

Generate exactly one practice character with ${levelCount} ordered practice steps (levels) on a Duolingo-style learning track.

Character-level fields (title, tagline, persona, voice, imagePrompt, liveAvatarId) define the shared practice partner.

Each level must:
- Cover a different situation, skill, or escalation step inspired by the source material
- Progress logically when ordered (easier → harder) without repeating the same scene
- Have its own title, subtitle, goal, meterLabel, winMessage, personaOverlay, opening line, and starters
- Use roleplay with a clear win condition tracked by a 0-100 meter`
      : `

Generate exactly one practice character with one practice step on the track.`

  return `Create a language-learning roleplay scenario for practicing ${languageName} (${regionLabel}, ${city}).${workspaceBlock}${trackBlock}

The scenario must:
- Include base persona text with {characterGender} placeholder, character age, short spoken lines only, and instruction to score pronunciation
- Put level-specific meter rules and scene instructions in each level's personaOverlay
- Set voice.gender to "random" unless the source clearly implies a specific character gender; use "opposite-speaker" only for coach/teacher-style agents
- Optionally set voice.voices with distinct Gemini voices for this agent. Valid examples include Charon, Kore, Fenrir, Puck, Aoede, Callirrhoe, Iapetus, Algieba, Rasalgethi, Laomedeia, Vindemiatrix, and Sulafat.
- openingLine.text and all starters must be in ${languageName}
- hints are short English glosses
- Be appropriate for language practice (no explicit content)
- Feel specific and fun, inspired by the user's source material when provided

LIVE AVATAR — pick liveAvatarId from this catalog (match gender, profession, and vibe):
${formatLiveAvatarCatalogForPrompt()}`
}

function parseGenerated(content: string, levelCount: number): GeneratedCharacterPayload {
  const parsed = JSON.parse(content) as GeneratedCharacterPayload

  if (!validateGeneratedCharacterPayload(parsed, levelCount)) {
    throw new Error("Invalid generated character shape")
  }

  parsed.liveAvatarId = validateGeneratedLiveAvatarId(
    parsed.liveAvatarId,
    parsed.voice.gender,
  )

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
    languageId?: string
    regionId?: string
    sourceType?: SourceType
    prompt?: string
    fileBase64?: string
    fileName?: string
    sourceLabel?: string
    workspaceId?: string
    levelCount?: number
    characterCount?: number
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
    workspaceId,
    levelCount: rawLevelCount,
    characterCount: rawCharacterCount,
  } = body

  const levelCount = Math.min(
    10,
    Math.max(
      1,
      Number.isFinite(rawLevelCount)
        ? Math.round(rawLevelCount!)
        : Number.isFinite(rawCharacterCount)
          ? Math.round(rawCharacterCount!)
          : 1,
    ),
  )

  const authorization = request.headers.get("authorization")
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null

  let workspaceContext: { name: string; description: string | null } | null =
    null
  if (workspaceId) {
    if (!accessToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabase = getSupabaseClientWithToken(accessToken)
    const { data, error } = await supabase
      .from("user_workspaces")
      .select("name, description")
      .eq("id", workspaceId)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 },
      )
    }

    workspaceContext = data
  }

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
    region.city,
    levelCount,
    workspaceContext ?? undefined,
  )

  const workspacePrefix = workspaceContext
    ? `Workspace: ${workspaceContext.name}${workspaceContext.description ? `\n${workspaceContext.description}` : ""}\n\n`
    : ""

  const sourceDescription =
    sourceType === "prompt"
      ? `${workspacePrefix}User prompt:\n${trimmedPrompt}`
      : sourceType === "text"
        ? `${workspacePrefix}Course or document text:\n${trimmedPrompt.slice(0, MAX_TEXT_CHARS)}`
        : `${workspacePrefix}Use the attached PDF (${fileName ?? "document.pdf"}) as source material for vocabulary, setting, characters, and goals.`

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
            name: "generated_character",
            strict: true,
            schema: buildGeneratedCharacterSchema(levelCount),
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Character generate error:", errorText)
      return NextResponse.json(
        { error: "Failed to generate character" },
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

    const payload = parseGenerated(content, levelCount)

    const userSource =
      sourceType === "pdf"
        ? `${workspacePrefix}PDF upload: ${fileName ?? "document.pdf"}`
        : `${workspacePrefix}${trimmedPrompt}`

    const moderation = await moderateGeneratedContent(
      apiKey,
      userSource,
      scenarioTextForModeration(payload),
      { languageName: language.name },
    )

    if (moderation.status === "blocked") {
      console.warn("Character content blocked:", moderation.reason)
      return NextResponse.json(
        {
          error: generationBlockedMessage(moderation),
          code: "content_blocked",
        },
        { status: 422 },
      )
    }

    if (moderation.status === "error") {
      console.warn(
        "Character content safety check failed, allowing through:",
        moderation.message,
      )
    }

    return NextResponse.json({ characters: [payload] })
  } catch (error) {
    console.error("Character generate route error:", error)
    return NextResponse.json(
      { error: "Failed to process character generation" },
      { status: 500 }
    )
  }
}
