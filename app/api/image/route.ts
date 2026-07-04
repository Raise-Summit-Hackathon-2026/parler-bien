import { NextResponse } from "next/server"

import { requireCurrentUser } from "@/lib/supabase"
import { getScenario, isBuiltInScenarioId } from "@/lib/scenarios"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const IMAGE_MODEL = "google/gemini-3.1-flash-lite-image"

const cache = new Map<string, string>()

function extractImageUrl(data: unknown): string | null {
  const response = data as {
    choices?: Array<{
      message?: {
        images?: Array<{
          image_url?: { url?: string }
          imageUrl?: { url?: string }
        }>
      }
    }>
  }

  const images = response.choices?.[0]?.message?.images
  if (!images?.length) return null

  const first = images[0]
  return first.image_url?.url ?? first.imageUrl?.url ?? null
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

  let body: { scenarioId?: string; prompt?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { scenarioId, prompt } = body

  let imagePrompt = prompt?.trim()
  let cacheKey = prompt?.trim()

  if (scenarioId) {
    if (!isBuiltInScenarioId(scenarioId)) {
      return NextResponse.json({ error: "Invalid scenarioId" }, { status: 400 })
    }
    const scenario = getScenario(scenarioId)
    imagePrompt = scenario.imagePrompt
    cacheKey = `scenario:${scenarioId}`
  }

  if (!imagePrompt || !cacheKey) {
    return NextResponse.json(
      { error: "scenarioId or prompt is required" },
      { status: 400 }
    )
  }

  const cached = cache.get(cacheKey)
  if (cached) {
    return NextResponse.json({ url: cached })
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
        model: IMAGE_MODEL,
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenRouter image error:", errorText)
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 502 }
      )
    }

    const data = await response.json()
    const url = extractImageUrl(data)

    if (!url) {
      return NextResponse.json(
        { error: "No image in response" },
        { status: 502 }
      )
    }

    cache.set(cacheKey, url)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("Image route error:", error)
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    )
  }
}
