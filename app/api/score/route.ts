import { NextResponse } from "next/server"

import type { AgentType } from "@/lib/agents"
import { requireCurrentUser } from "@/lib/supabase"
import { moderateExchange } from "@/lib/content-safety"
import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_REGION_ID,
  getLanguage,
  getRegion,
  isLanguageId,
  isRegionId,
  type LanguageId,
  type RegionId,
} from "@/lib/languages"
import { buildAgentPrompt } from "@/lib/prompts"
import {
  isCustomScenarioId,
  isScenarioId,
  resolveScenario,
  type Scenario,
} from "@/lib/scenarios"
import { pronunciationScoreJsonSchema } from "@/lib/score-schema"
import type { LevelRoom } from "@/lib/workspace-types"
import type { ConversationTurn, PronunciationScore, VoiceAgent } from "@/lib/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

function buildLegacyPrompt(
  phrase: string | undefined,
  languageId: LanguageId,
  regionId: RegionId,
  scenario: Scenario,
  history: ConversationTurn[],
  characterGender: "male" | "female",
  currentMeter: number,
) {
  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  if (scenario.id === "teacher") {
    return buildAgentPrompt({
      agentType: "language",
      agent: {
        id: "teacher",
        type: "language",
        name: "Coach",
        tagline: "",
        avatarPrompt: "",
        voice: scenario.voice,
        skills: [],
        previewScript: "",
        capabilities: ["pronunciation_score", "word_breakdown"],
        personaBase: "",
        deliveryStyle: "",
        coachingStyle: "",
      },
      scenario,
      characterGender,
      history,
      currentMeter,
      phrase,
      languageName: language.name,
      region,
    })
  }

  return buildAgentPrompt({
    agentType: "roleplay",
    agent: {
      id: scenario.id,
      type: "roleplay",
      name: scenario.title,
      tagline: scenario.tagline,
      avatarPrompt: scenario.imagePrompt,
      voice: scenario.voice,
      skills: [],
      previewScript: "",
      capabilities: ["goal_meter", "goal_completion"],
      personaBase: scenario.persona,
      deliveryStyle: "",
      coachingStyle: "",
    },
    scenario,
    characterGender,
    history,
    currentMeter,
    phrase,
    languageName: language.name,
    region,
  })
}

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
    agentType?: AgentType
    agent?: VoiceAgent
    levelRoom?: LevelRoom
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
    agentType,
    agent,
    levelRoom,
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

  if (!isScenarioId(scenarioId)) {
    return NextResponse.json({ error: "Invalid scenarioId" }, { status: 400 })
  }

  if (isCustomScenarioId(scenarioId) && !customScenario) {
    return NextResponse.json(
      { error: "customScenario is required for custom scenarios" },
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
  const languageMeta = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  const prompt =
    agentType && agent
      ? buildAgentPrompt({
          agentType,
          agent,
          scenario,
          characterGender,
          history: cappedHistory,
          currentMeter,
          phrase,
          languageName: languageMeta.name,
          region,
          levelRoom,
        })
      : buildLegacyPrompt(
          phrase,
          languageId,
          regionId,
          scenario,
          cappedHistory,
          characterGender,
          currentMeter,
        )

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

    const assistantText = [
      score.reply.text,
      score.reply.tts_text,
      score.coaching,
      ...score.next_sentences.map((sentence) => sentence.text),
    ].join("\n")

    const moderation = await moderateExchange(
      apiKey,
      score.transcript,
      assistantText,
      {
        scenarioTitle: scenario.title,
        languageName: languageMeta.name,
        isRoleplay: agentType === "roleplay" || (scenario.id !== "teacher" && !agentType),
      },
    )

    if (moderation.status === "blocked") {
      console.warn("Content blocked:", moderation.reason)
      return NextResponse.json(
        {
          error: !moderation.userSafe
            ? "That message wasn't appropriate for practice. Try rephrasing and stay in the scenario."
            : "We couldn't generate a safe response. Please try again.",
          code: "content_blocked",
        },
        { status: 422 }
      )
    }

    if (moderation.status === "error") {
      console.warn(
        "Content safety check failed, allowing through:",
        moderation.message
      )
    }

    return NextResponse.json(score)
  } catch (error) {
    console.error("Score route error:", error)
    return NextResponse.json(
      { error: "Failed to process pronunciation score" },
      { status: 500 }
    )
  }
}
