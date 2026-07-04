import { NextResponse } from "next/server"

import { moderateExchange } from "@/lib/content-safety"
import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_REGION_ID,
  getLanguage,
  getRegion,
  isLanguageId,
  isRegionId,
  type LanguageId,
  type Region,
  type RegionId,
} from "@/lib/languages"
import {
  formatPersona,
  isCustomScenarioId,
  isScenarioId,
  resolveScenario,
  type Scenario,
} from "@/lib/scenarios"
import { isLinguaTrainerId } from "@/lib/lingua-trainers"
import { buildLinguaTrainerPrompt } from "@/lib/lingua-trainer-prompts"
import { pronunciationScoreJsonSchema } from "@/lib/score-schema"
import type { ConversationTurn, PronunciationScore } from "@/lib/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

function formatHistory(history: ConversationTurn[]) {
  if (history.length === 0) return "No prior conversation."

  return history
    .map((turn) => `${turn.role === "user" ? "User" : "Character"}: ${turn.text}`)
    .join("\n")
}

function buildTeacherPrompt(
  phrase: string | undefined,
  languageName: string,
  region: Region,
) {
  const modeInstructions = phrase
    ? `Target phrase: "${phrase}"
Score their pronunciation against this target phrase. Set transcript to the target phrase.`
    : `No target phrase was given. Transcribe what the user said in ${languageName}, then score their pronunciation against native ${region.accent} pronunciation. Set transcript to what you heard. If you cannot detect intelligible ${languageName}, return a low overall_score with coaching "I couldn't quite catch that — try speaking clearly and closer to the mic."`

  const replyLanguage =
    languageName === "English"
      ? `${languageName} with a ${region.accent} accent`
      : `${languageName} or simple ${languageName} with brief English gloss in reply.hint`

  return `You are a pronunciation coach. The user is practicing speaking ${languageName} with a ${region.accent} accent. The setting is ${region.city}.

${modeInstructions}

Listen to their recording and score their pronunciation against native ${region.accent}. Be slightly generous but accurate. Ignore background noise.

Also infer speaker metadata from the voice: accent (native/source language influencing their ${languageName}), age_range (rough estimate like "20-30"), gender (male | female | unsure), and notes (one short sentence on how this profile affects their ${languageName}). Use this profile to tailor coaching, per-word tips, and reply to accent-specific pitfalls. Keep estimates non-judgmental.

The coach character speaking in reply is the OPPOSITE gender of the speaker (male speaker → female coach, female speaker → male coach, unsure → female coach). Write reply.text as the coach's spoken feedback (2-3 sentences max): warm, clear, professional teacher tone in ${replyLanguage}. Not flirtatious. reply.hint is a short English summary unless the conversation is already in English.

Set meter to 0 and goal_achieved to false.

Split the transcript into individual words. Score each word from 0-100. Use null for issue and tip when a word scores 80 or above.

Provide exactly 3 next_sentences: short ${languageName} follow-up sentences to practice next (with ${region.accent} flavor), each with an English hint. Mention one natural next step in reply.text. Do not repeat coaching verbatim in reply.text.`
}

function buildScenarioPrompt(
  scenario: Scenario,
  characterGender: "male" | "female",
  history: ConversationTurn[],
  currentMeter: number,
  phrase: string | undefined,
  languageName: string,
  region: Region,
) {
  const persona = formatPersona(scenario, characterGender, languageName, region)

  const targetNote = phrase
    ? `The user is trying to say: "${phrase}". Score against this if they attempted it; otherwise score what they actually said.`
    : `Transcribe what the user said in ${languageName}. If unintelligible, return low scores and a reply that stays in character asking them to repeat.`

  return `${persona}

Conversation so far:
${formatHistory(history)}

Current meter: ${currentMeter}
${targetNote}

Listen to the latest user audio turn. Stay in character. Update meter per the rules (current meter is ${currentMeter}). Set reply.text to your in-character response in ${languageName} (short). Set reply.hint to an English gloss.

IMPORTANT — goal_achieved consistency: if your reply concedes or grants the user's goal in ANY way (handing over the item, agreeing to the deal, giving the number, offering the table/lease/invitation, letting them in, accepting their proof or story), you MUST set goal_achieved to true and meter to at least 95. Never write a conceding reply while leaving goal_achieved false.

Also score pronunciation of what the user said against native ${region.accent}: overall_score, words array from transcript, coaching (brief pronunciation note), speaker profile from their voice.

Provide exactly 3 next_sentences the user could say to continue (in ${languageName}, with ${region.accent} flavor).`
}

function buildPrompt(
  phrase: string | undefined,
  languageId: LanguageId,
  regionId: RegionId,
  scenario: Scenario,
  history: ConversationTurn[] = [],
  characterGender: "male" | "female" = "female",
  currentMeter = 0,
) {
  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  if (scenario.id === "teacher") {
    return buildTeacherPrompt(phrase, language.name, region)
  }

  if (isLinguaTrainerId(scenario.id)) {
    return buildLinguaTrainerPrompt(scenario.id, phrase)
  }

  return buildScenarioPrompt(
    scenario,
    characterGender,
    history,
    currentMeter,
    phrase,
    language.name,
    region,
  )
}

function parseScore(content: string): PronunciationScore {
  const parsed = JSON.parse(content) as PronunciationScore

  if (
    typeof parsed.overall_score !== "number" ||
    typeof parsed.coaching !== "string" ||
    typeof parsed.transcript !== "string" ||
    !parsed.reply ||
    typeof parsed.reply.text !== "string" ||
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
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 },
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
      { status: 400 },
    )
  }

  if (!isScenarioId(scenarioId)) {
    return NextResponse.json({ error: "Invalid scenarioId" }, { status: 400 })
  }

  if (isCustomScenarioId(scenarioId) && !customScenario) {
    return NextResponse.json(
      { error: "customScenario is required for custom scenarios" },
      { status: 400 },
    )
  }

  let scenario: Scenario
  try {
    scenario = resolveScenario(scenarioId, customScenario)
  } catch {
    return NextResponse.json({ error: "Invalid custom scenario" }, { status: 400 })
  }

  const cappedHistory = history.slice(-12)

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
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildPrompt(
                  phrase,
                  languageId,
                  regionId,
                  scenario,
                  cappedHistory,
                  characterGender,
                  currentMeter,
                ),
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
        { status: 502 },
      )
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 502 },
      )
    }

    const score = parseScore(content)

    const language = getLanguage(languageId)
    const assistantText = [
      score.reply.text,
      score.coaching,
      ...score.next_sentences.map((sentence) => sentence.text),
    ].join("\n")

    const moderation = await moderateExchange(
      apiKey,
      score.transcript,
      assistantText,
      {
        scenarioTitle: scenario.title,
        languageName: language.name,
        isRoleplay:
          scenario.id !== "teacher" &&
          !isLinguaTrainerId(scenario.id),
      },
    )

    if (moderation.status === "blocked") {
      console.warn("Content blocked:", moderation.reason)
      return NextResponse.json(
        {
          error:
            !moderation.userSafe
              ? "That message wasn't appropriate for practice. Try rephrasing and stay in the scenario."
              : "We couldn't generate a safe response. Please try again.",
          code: "content_blocked",
        },
        { status: 422 },
      )
    }

    if (moderation.status === "error") {
      console.warn(
        "Content safety check failed, allowing through:",
        moderation.message,
      )
    }

    return NextResponse.json(score)
  } catch (error) {
    console.error("Score route error:", error)
    return NextResponse.json(
      { error: "Failed to process pronunciation score" },
      { status: 500 },
    )
  }
}
