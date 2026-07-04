"use client"

import { useEffect, useState } from "react"

import type { BuiltInScenarioId } from "@/lib/scenarios"
import { authenticatedFetch } from "@/lib/supabase"
import { cn } from "@/lib/utils"

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
  const hasSource = Boolean(scenarioId || imagePrompt)
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(hasSource)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!hasSource) return

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(false)

      try {
        const response = await authenticatedFetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            imagePrompt ? { prompt: imagePrompt } : { scenarioId }
          ),
        })

        if (!response.ok) throw new Error("Image fetch failed")

        const data = (await response.json()) as { url?: string }
        if (!cancelled && data.url) {
          setUrl(data.url)
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
  }, [scenarioId, imagePrompt, hasSource])

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
