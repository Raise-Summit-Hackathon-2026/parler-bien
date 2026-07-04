"use client"

import { Loader2 } from "lucide-react"

import { ScenarioScene } from "@/components/scenario-scene"
import type { LiveAvatarStatus } from "@/hooks/use-live-avatar"
import type { BuiltInScenarioId } from "@/lib/scenarios"
import { cn } from "@/lib/utils"

type AvatarStageProps = {
  status: LiveAvatarStatus
  attachVideo: (element: HTMLVideoElement | null) => void
  remainingSeconds?: number | null
  scenarioId?: BuiltInScenarioId
  imagePrompt?: string
  className?: string
  overlay?: boolean
}

function formatRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function AvatarStage({
  status,
  attachVideo,
  remainingSeconds,
  scenarioId,
  imagePrompt,
  className,
  overlay = true,
}: AvatarStageProps) {
  const showLiveVideo = status === "ready" || status === "speaking"
  const showConnecting = status === "connecting"
  const showExpired = status === "expired"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-muted",
        className,
      )}
    >
      <ScenarioScene
        scenarioId={scenarioId}
        imagePrompt={imagePrompt}
        className="absolute inset-0 size-full rounded-none"
        overlay={false}
      />

      {showConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
            <Loader2 className="size-3.5 animate-spin" />
            Going live…
          </div>
        </div>
      )}

      <video
        ref={attachVideo}
        className={cn(
          "absolute inset-0 size-full object-cover object-[center_20%] transition-opacity duration-500",
          showLiveVideo ? "opacity-100" : "opacity-0",
        )}
        autoPlay
        playsInline
      />

      {showExpired && (
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
          <p className="text-center text-[11px] font-medium text-white/90">
            Avatar session ended — voice replies continue
          </p>
        </div>
      )}

      {showLiveVideo && remainingSeconds != null && remainingSeconds <= 15 && (
        <div className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatRemaining(remainingSeconds)}
        </div>
      )}

      {overlay && (
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
      )}
    </div>
  )
}
