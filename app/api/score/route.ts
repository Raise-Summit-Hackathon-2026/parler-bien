import { NextResponse } from "next/server"

import { pronunciationScoreJsonSchema } from "@/lib/score-schema"
import type { PronunciationScore } from "@/lib/types"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

function buildPrompt(phrase: string, language: string) {
  return `You are a pronunciation coach. The user is practicing saying a phrase in ${language}.

Target phrase: "${phrase}"

Listen to their recording and score their pronunciation. Be slightly generous but accurate. Ignore background noise and focus on whether they attempted the target phrase.

Respond with JSON only. Split the phrase into individual words (including punctuation attached to words as in the original). Score each word from 0-100. Use null for issue and tip when a word scores 80 or above.

Also write voice_line: a short in-character spoken reaction for text-to-speech (2-3 sentences max). Use French-accented English with occasional French pet names (mon chéri, etc.) and optional bracket performance tags like [laughs softly] or [whispers]. Match the emotional arc to the score: encouraging and gentle around 60, warm and teasing around 75, celebratory and flirtatious at 90+. Do not repeat the coaching text verbatim.`
}

function parseScore(content: string): PronunciationScore {
  const parsed = JSON.parse(content) as PronunciationScore

  if (
    typeof parsed.overall_score !== "number" ||
    typeof parsed.coaching !== "string" ||
    typeof parsed.voice_line !== "string" ||
    !Array.isArray(parsed.words)
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

  if (!audioBase64 || !audioFormat || !phrase || !language) {
    return NextResponse.json(
      { error: "audioBase64, audioFormat, phrase, and language are required" },
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
