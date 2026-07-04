import { NextResponse } from "next/server"

import {
  buildSpeechInput,
  pcmToWav,
  TTS_MODEL,
  TTS_VOICE,
  ttsCacheKey,
  type TtsStyle,
} from "@/lib/tts"

const OPENROUTER_SPEECH_URL = "https://openrouter.ai/api/v1/audio/speech"

const cache = new Map<string, Buffer>()

const VALID_STYLES: TtsStyle[] = ["coach", "phrase", "word"]

function isTtsStyle(value: string): value is TtsStyle {
  return VALID_STYLES.includes(value as TtsStyle)
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 },
    )
  }

  let body: { text?: string; style?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { text, style } = body

  if (!text?.trim() || !style || !isTtsStyle(style)) {
    return NextResponse.json(
      { error: "text and style (coach | phrase | word) are required" },
      { status: 400 },
    )
  }

  const key = ttsCacheKey(text.trim(), style)
  const cached = cache.get(key)
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "private, max-age=3600",
      },
    })
  }

  try {
    const response = await fetch(OPENROUTER_SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Parler Bien",
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input: buildSpeechInput(text.trim(), style),
        response_format: "pcm",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenRouter TTS error:", errorText)
      return NextResponse.json({ error: "Failed to generate speech" }, { status: 502 })
    }

    const pcm = Buffer.from(await response.arrayBuffer())
    const wav = pcmToWav(pcm)
    cache.set(key, wav)

    return new NextResponse(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("TTS route error:", error)
    return NextResponse.json({ error: "Failed to process speech" }, { status: 500 })
  }
}
