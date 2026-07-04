"use client"

import { Pause, Play, Volume2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  getAntiPatternClips,
  getOldMoneyReferenceClips,
  LAUGH_DATASET_SOURCES,
  LAUGH_REFERENCE_CLIPS,
  LAUGH_TYPES,
  type LaughReferenceClip,
  type LaughTypeId,
} from "@/lib/laugh-examples"
import { cn } from "@/lib/utils"

type LaughReferenceGalleryProps = {
  /** Hook screen: play contrast clips on load */
  autoPlayClipIds?: string[]
  /** Highlight specific clips (hook + demo) */
  emphasizeClipIds?: string[]
  /** Compact layout for intro hook */
  variant?: "default" | "hook"
}

function ClipCard({
  clip,
  playing,
  onToggle,
  emphasized,
}: {
  clip: LaughReferenceClip
  playing: boolean
  onToggle: () => void
  emphasized?: boolean
}) {
  const type = LAUGH_TYPES.find((t) => t.id === clip.laughTypeId)

  return (
    <div
      className={cn(
        "rounded-2xl border bg-background p-3",
        emphasized && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {type?.emoji} {type?.label}
          </p>
          <p className="mt-0.5 font-medium">{clip.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{clip.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Target score: {clip.targetScoreMin}–{clip.targetScoreMax}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onToggle}
          aria-label={playing ? "Pause example" : "Play example"}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
      </div>
    </div>
  )
}

function TypePill({ id, active }: { id: LaughTypeId; active?: boolean }) {
  const type = LAUGH_TYPES.find((t) => t.id === id)
  if (!type) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {type.emoji} {type.label}
    </span>
  )
}

export function LaughReferenceGallery({
  autoPlayClipIds,
  emphasizeClipIds = [],
  variant = "default",
}: LaughReferenceGalleryProps = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const autoPlayed = useRef(false)

  const goldStandard = getOldMoneyReferenceClips()
  const antiPatterns = getAntiPatternClips()
  const isHook = variant === "hook"
  const emphasizeSet = new Set(emphasizeClipIds)

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setPlayingId(null)
  }

  function playClip(clip: LaughReferenceClip): Promise<void> {
    return new Promise((resolve) => {
      stopAudio()
      const audio = new Audio(clip.audioSrc)
      audioRef.current = audio
      setPlayingId(clip.id)
      audio.onended = () => {
        setPlayingId(null)
        resolve()
      }
      audio.onerror = () => {
        setPlayingId(null)
        resolve()
      }
      void audio.play().catch(() => resolve())
    })
  }

  function toggleClip(clip: LaughReferenceClip) {
    if (playingId === clip.id) {
      stopAudio()
      return
    }
    void playClip(clip)
  }

  useEffect(() => {
    if (!autoPlayClipIds?.length || autoPlayed.current) return
    autoPlayed.current = true

    let cancelled = false
    ;(async () => {
      for (const id of autoPlayClipIds) {
        if (cancelled) break
        const clip = LAUGH_REFERENCE_CLIPS.find((c) => c.id === id)
        if (clip) {
          await playClip(clip)
          if (!cancelled) await new Promise((r) => setTimeout(r, 400))
        }
      }
    })()

    return () => {
      cancelled = true
      stopAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hook autoplay once on mount
  }, [autoPlayClipIds])

  const hookAnti = antiPatterns.filter((c) => emphasizeSet.has(c.id))
  const hookGold = goldStandard.filter((c) => emphasizeSet.has(c.id))
  const displayAnti = isHook && hookAnti.length ? hookAnti : antiPatterns
  const displayGold = isHook && hookGold.length ? hookGold : goldStandard

  return (
    <div className={cn("space-y-5 p-6", variant === "default" && "border-t pt-5")}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Reference laughs</p>
        </div>
        {!isHook && (
          <>
            <p className="text-xs text-muted-foreground">
              Clips from Wikimedia Commons (CC0). Taxonomy from Tanaka/Campbell polite vs mirthful,
              SMILE-Next, and VocalSound research.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <TypePill id="old_money" active />
              <TypePill id="polite" />
              <TypePill id="mirthful" />
              <TypePill id="nervous" />
              <TypePill id="try_hard" />
            </div>
          </>
        )}
        {isHook && (
          <p className="text-xs text-muted-foreground">
            Anti-pattern vs gold standard — tap to replay.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
          Gold standard — imitate these
        </p>
        <div className="space-y-2">
          {displayGold.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              playing={playingId === clip.id}
              onToggle={() => toggleClip(clip)}
              emphasized={emphasizeSet.has(clip.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-rose-600 uppercase dark:text-rose-400">
          Anti-patterns — avoid these
        </p>
        <div className="space-y-2">
          {displayAnti.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              playing={playingId === clip.id}
              onToggle={() => toggleClip(clip)}
              emphasized={emphasizeSet.has(clip.id)}
            />
          ))}
        </div>
      </div>

      {!isHook && (
      <details className="rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          Research datasets (not bundled)
        </summary>
        <ul className="mt-2 space-y-2">
          {LAUGH_DATASET_SOURCES.map((source) => (
            <li key={source.name}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {source.name}
              </a>
              {" — "}
              {source.size}. {source.note}
            </li>
          ))}
        </ul>
      </details>
      )}
    </div>
  )
}
