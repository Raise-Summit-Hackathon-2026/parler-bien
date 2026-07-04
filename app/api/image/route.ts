import { NextResponse } from "next/server"

import { getCachedImageUrl, setCachedImageUrl } from "@/lib/image-cache-db"
import {
  getBuiltInCharacter,
  isBuiltInCharacterId,
} from "@/lib/characters/index"
import { requireCurrentUser } from "@/lib/supabase"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const IMAGE_MODEL = "google/gemini-3.1-flash-lite-image"

const imageCache = new Map<string, string>()
const inFlightImages = new Map<string, Promise<string>>()

class ImageGenerationError extends Error {}

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

async function generateImageUrl(apiKey: string, imagePrompt: string) {
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
      messages: [{ role: "user", content: imagePrompt }],
      modalities: ["image", "text"],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("OpenRouter image error:", errorText)
    throw new ImageGenerationError("Failed to generate image")
  }

  const data = await response.json()
  const url = extractImageUrl(data)

  if (!url) {
    throw new ImageGenerationError("No image in response")
  }

  return url
}

export async function POST(request: Request) {
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
    if (!isBuiltInCharacterId(scenarioId)) {
      return NextResponse.json({ error: "Invalid scenarioId" }, { status: 400 })
    }
    const character = getBuiltInCharacter(scenarioId)
    imagePrompt = character.avatarPrompt
    cacheKey = `scenario:${scenarioId}`
  }

  if (!imagePrompt || !cacheKey) {
    return NextResponse.json(
      { error: "scenarioId or prompt is required" },
      { status: 400 }
    )
  }

  const cached = imageCache.get(cacheKey)
  if (cached) {
    return NextResponse.json({ url: cached })
  }

  const persisted = await getCachedImageUrl(cacheKey)
  if (persisted) {
    imageCache.set(cacheKey, persisted)
    return NextResponse.json({ url: persisted })
  }

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

  try {
    let pending = inFlightImages.get(cacheKey)
    if (!pending) {
      pending = (async () => {
        const cachedUrl = await getCachedImageUrl(cacheKey)
        if (cachedUrl) return cachedUrl

        const url = await generateImageUrl(apiKey, imagePrompt)
        await setCachedImageUrl(cacheKey, imagePrompt, url)
        return url
      })()
        .then((url) => {
          imageCache.set(cacheKey, url)
          return url
        })
        .finally(() => {
          inFlightImages.delete(cacheKey)
        })
      inFlightImages.set(cacheKey, pending)
    }

    const url = await pending
    return NextResponse.json({ url })
  } catch (error) {
    console.error("Image route error:", error)
    if (error instanceof ImageGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    )
  }
}
