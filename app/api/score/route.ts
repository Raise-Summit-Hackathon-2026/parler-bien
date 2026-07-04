import { NextResponse } from "next/server"

import { pronunciationScoreJsonSchema } from "@/lib/score-schema"
import type { PronunciationScore } from "@/lib/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

function buildPrompt(phrase: string | undefined, language: string) {
  const modeInstructions = phrase
    ? `Target phrase: "${phrase}"
Score their pronunciation against this target phrase. Set transcript to the target phrase.`
    : `No target phrase was given. Transcribe what the user said in ${language}, then score their pronunciation of that sentence against native pronunciation. Set transcript to what you heard. If you cannot detect intelligible ${language}, return a low overall_score with coaching "I couldn't quite catch that — try speaking clearly and closer to the mic."`

  return `You are a pronunciation coach. The user is practicing speaking ${language}.

${modeInstructions}

Listen to their recording and score their pronunciation. Be slightly generous but accurate. Ignore background noise.

Also infer speaker metadata from the voice: accent (native/source language influencing their French), age_range (rough estimate like "20-30"), gender (male | female | unsure), and notes (one short sentence on how this profile affects their French). Use this profile to tailor coaching, per-word tips, and voice_line to accent-specific pitfalls. Keep estimates non-judgmental.

Respond with JSON only. Split the transcript into individual words (including punctuation attached to words as in the original). Score each word from 0-100. Use null for issue and tip when a word scores 80 or above.

Provide exactly 3 next_sentences: short French follow-up sentences that naturally continue the conversation from what the user just said, each with a short English hint. Slightly extend or deepen the scenario.

Write voice_line: a short spoken reaction for text-to-speech (2-3 sentences max). Write as a native French pronunciation teacher who matches the speaker's detected gender and approximate age — a French man for male speakers, a French woman for female speakers. Be warm, clear, and encouraging with a professional teacher tone. Not flirtatious, no pet names. Use French or simple French-accented English. Match the emotional arc to the score: encouraging around 60, positive around 75, celebratory at 90+. Tailor feedback to their detected accent. Mention one natural next step from next_sentences. Do not repeat the coaching text verbatim.`
}

function parseScore(content: string): PronunciationScore {
  const parsed = JSON.parse(content) as PronunciationScore

  if (
    typeof parsed.overall_score !== "number" ||
    typeof parsed.coaching !== "string" ||
    typeof parsed.voice_line !== "string" ||
    typeof parsed.transcript !== "string" ||
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
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { audioBase64, audioFormat, phrase, language } = body

  if (!audioBase64 || !audioFormat || !language) {
    return NextResponse.json(
      { error: "audioBase64, audioFormat, and language are required" },
      { status: 400 },
    )
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
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildPrompt(phrase, language) },
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

    return NextResponse.json(parseScore(content))
  } catch (error) {
    console.error("Score route error:", error)
    return NextResponse.json(
      { error: "Failed to process pronunciation score" },
      { status: 500 },
    )
  }
}
