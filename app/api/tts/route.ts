import { NextResponse } from "next/server"

import {
  buildSpeechInput,
  pcmToWav,
  selectVoice,
  TTS_MODEL,
  ttsCacheKey,
  type TtsStyle,
} from "@/lib/tts"
import { requireCurrentUser } from "@/lib/supabase"

const OPENROUTER_SPEECH_URL = "https://openrouter.ai/api/v1/audio/speech"

const cache = new Map<string, Buffer>()

const VALID_STYLES: TtsStyle[] = ["coach", "phrase", "word", "character"]

function isTtsStyle(value: string): value is TtsStyle {
  return VALID_STYLES.includes(value as TtsStyle)
}

function isCharacterGender(value: string): value is "male" | "female" {
  return value === "male" || value === "female"
}

function truncateForLog(value: string, maxLength = 240) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

async function readResponseBody(response: Response) {
  const body = await response.text()
  try {
    return JSON.parse(body) as unknown
  } catch {
    return body
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
    text?: string
    style?: string
    gender?: string
    voice?: string
    ageRange?: string
    tone?: string
    accent?: string
    deliveryStyle?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    text,
    style,
    gender,
    voice: requestedVoice,
    ageRange,
    tone,
    accent,
    deliveryStyle,
  } = body

  if (!text?.trim() || !style || !isTtsStyle(style)) {
    return NextResponse.json(
      {
        error:
          "text and style (coach | phrase | word | character) are required",
      },
      { status: 400 }
    )
  }

  const ttsOptions =
    style === "coach" || style === "character"
      ? {
          gender: gender && isCharacterGender(gender) ? gender : undefined,
          voice: requestedVoice?.trim() || undefined,
          ageRange: ageRange?.trim() || undefined,
          tone: tone?.trim() || undefined,
          accent: accent?.trim() || undefined,
          deliveryStyle: deliveryStyle?.trim() || undefined,
        }
      : {
          accent: accent?.trim() || undefined,
          voice: requestedVoice?.trim() || undefined,
        }

  const key = ttsCacheKey(text.trim(), style, ttsOptions)
  const cached = cache.get(key)
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "private, max-age=3600",
      },
    })
  }

  const selectedVoice =
    style === "coach" || style === "character"
      ? selectVoice(ttsOptions?.gender, ttsOptions?.voice)
      : selectVoice(undefined, ttsOptions?.voice)

  try {
    const speechInput = buildSpeechInput(text.trim(), style, ttsOptions)
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Parler Bien",
      }
    const primaryPayload = {
      model: TTS_MODEL,
      voice: selectedVoice,
      input: speechInput,
      response_format: "pcm",
    }
    const fallbackPayload = {
      ...primaryPayload,
      input: text.trim(),
    }

    const attempts = [
      { label: "primary", payload: primaryPayload },
      { label: "primary-retry", payload: primaryPayload },
      { label: "plain-transcript-fallback", payload: fallbackPayload },
    ]

    let response: Response | null = null

    for (const attempt of attempts) {
      response = await fetch(OPENROUTER_SPEECH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(attempt.payload),
      })

      if (response.ok) {
        if (attempt.label !== "primary") {
          console.warn("OpenRouter TTS recovered after retry:", {
            attempt: attempt.label,
            model: TTS_MODEL,
            selectedVoice,
            style,
          })
        }
        break
      }

      const parsedError = await readResponseBody(response)

      console.error("OpenRouter TTS error details:", {
        attempt: attempt.label,
        status: response.status,
        statusText: response.statusText,
        body: parsedError,
        headers: {
          "content-type": response.headers.get("content-type"),
          "x-request-id": response.headers.get("x-request-id"),
          "x-openrouter-provider": response.headers.get("x-openrouter-provider"),
        },
        request: {
          model: TTS_MODEL,
          style,
          selectedVoice,
          requestedVoice: requestedVoice?.trim() || null,
          gender: ttsOptions.gender ?? null,
          ageRange: ttsOptions.ageRange ?? null,
          tone: ttsOptions.tone ?? null,
          accent: ttsOptions.accent ?? null,
          deliveryStyle: ttsOptions.deliveryStyle ?? null,
          responseFormat: "pcm",
          textLength: text.trim().length,
          inputLength: attempt.payload.input.length,
          textPreview: truncateForLog(text.trim()),
          inputPreview: truncateForLog(attempt.payload.input, 500),
        },
      })
    }

    if (!response?.ok) {
      return NextResponse.json(
        { error: "Failed to generate speech" },
        { status: 502 }
      )
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
    return NextResponse.json(
      { error: "Failed to process speech" },
      { status: 500 }
    )
  }
}
