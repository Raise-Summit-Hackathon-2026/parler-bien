"use client"

import { useEffect, useState } from "react"

import type { BuiltInScenarioId } from "@/lib/scenarios"
import { authenticatedFetch } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const imageUrlCache = new Map<string, string>()
const imageRequestCache = new Map<string, Promise<string>>()

type UseScenarioImageOptions = {
  scenarioId?: BuiltInScenarioId
  imagePrompt?: string
}

type UseScenarioImageResult = {
  url: string | null
  isLoading: boolean
  error: boolean
}

export function useScenarioImage({
  scenarioId,
  imagePrompt,
}: UseScenarioImageOptions): UseScenarioImageResult {
  const prompt = imagePrompt?.trim()
  const cacheKey = scenarioId
    ? `scenario:${scenarioId}`
    : prompt
      ? `prompt:${prompt}`
      : null
  const cachedUrl = cacheKey ? imageUrlCache.get(cacheKey) : undefined

  const [url, setUrl] = useState<string | null>(cachedUrl ?? null)
  const [isLoading, setIsLoading] = useState(Boolean(cacheKey && !cachedUrl))
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!cacheKey) return
    const key = cacheKey

    let cancelled = false

    async function load() {
      const cached = imageUrlCache.get(key)
      if (cached) {
        if (!cancelled) {
          setUrl(cached)
          setIsLoading(false)
          setError(false)
        }
        return
      }

      setIsLoading(true)
      setError(false)

      try {
        let request = imageRequestCache.get(key)
        if (!request) {
          request = authenticatedFetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prompt ? { prompt } : { scenarioId }),
          })
            .then(async (response) => {
              if (!response.ok) throw new Error("Image fetch failed")

              const data = (await response.json()) as { url?: string }
              if (!data.url) throw new Error("Image response missing URL")

              imageUrlCache.set(key, data.url)
              return data.url
            })
            .finally(() => {
              imageRequestCache.delete(key)
            })

          imageRequestCache.set(key, request)
        }

        const nextUrl = await request
        if (!cancelled) {
          setUrl(nextUrl)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [scenarioId, prompt, cacheKey])

  if (!cacheKey) return { url: null, isLoading: false, error: false }
  return { url, isLoading, error }
}

type ScenarioSceneProps = {
  scenarioId?: BuiltInScenarioId
  imagePrompt?: string
  className?: string
  overlay?: boolean
}

export function ScenarioScene({
  scenarioId,
  imagePrompt,
  className,
  overlay = true,
}: ScenarioSceneProps) {
  const { url, isLoading, error } = useScenarioImage({
    scenarioId,
    imagePrompt,
  })

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl bg-muted", className)}
    >
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-linear-to-br from-muted to-muted-foreground/10" />
      )}
      {!isLoading && !error && url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      )}
      {error && (
        <div className="absolute inset-0 bg-linear-to-br from-muted to-muted-foreground/20" />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />
      )}
    </div>
  )
}
