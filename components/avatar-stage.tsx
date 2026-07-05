"use client"

import { Loader2, Video, VideoOff } from "lucide-react"
import { useEffect, useRef } from "react"

import { ScenarioScene } from "@/components/scenario-scene"
import { Button } from "@/components/ui/button"
import type { LiveAvatarStatus } from "@/hooks/use-live-avatar"
import {
  DEFAULT_CHROMA_KEY_OPTIONS,
  setupChromaKey,
} from "@/lib/chroma-key"
import { isLiveAvatarSandbox } from "@/lib/liveavatar"
import { cn } from "@/lib/utils"

type AvatarStageProps = {
  status: LiveAvatarStatus
  attachVideo: (element: HTMLVideoElement | null) => void
  avatarEnabled: boolean
  onToggleAvatar: (enabled: boolean) => void
  onRestart?: () => void
  scenarioId?: string
  imagePrompt?: string
  className?: string
  overlay?: boolean
}

export function AvatarStage({
  status,
  attachVideo,
  avatarEnabled,
  onToggleAvatar,
  onRestart,
  scenarioId,
  imagePrompt,
  className,
  overlay = true,
}: AvatarStageProps) {
  const sandbox = isLiveAvatarSandbox()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const showLiveVideo =
    avatarEnabled && (status === "ready" || status === "speaking")
  const showConnecting = avatarEnabled && status === "connecting"
  const showPaused = avatarEnabled && status === "paused"
  const showError = avatarEnabled && status === "error"

  useEffect(() => {
    attachVideo(videoRef.current)
  }, [attachVideo])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!showLiveVideo || !video || !canvas) return

    return setupChromaKey(video, canvas, DEFAULT_CHROMA_KEY_OPTIONS)
  }, [showLiveVideo])

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
        fit="cover"
      />

      {showConnecting && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
            <Loader2 className="size-3.5 animate-spin" />
            Going live…
          </div>
        </div>
      )}

      {/* Raw greenscreen stream — audio plays from here; video is keyed onto canvas */}
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 size-full opacity-0"
        autoPlay
        playsInline
      />

      <canvas
        ref={canvasRef}
        className={cn(
          "pointer-events-none absolute inset-0 z-10 size-full object-contain object-bottom transition-opacity duration-500",
          showLiveVideo ? "opacity-100" : "opacity-0",
        )}
      />

      {showPaused && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
          <p className="text-center text-[11px] font-medium text-white/90">
            Avatar paused — it wakes on your next turn
          </p>
          {onRestart && (
            <Button
              size="xs"
              variant="secondary"
              className="mx-auto mt-2 flex"
              onClick={onRestart}
            >
              Resume now
            </Button>
          )}
        </div>
      )}

      {showError && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
          <p className="text-center text-[11px] font-medium text-white/90">
            Avatar unavailable — using voice only
          </p>
        </div>
      )}

      <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5">
        <Button
          type="button"
          size="xs"
          variant="secondary"
          className="h-7 gap-1 rounded-full bg-black/55 px-2 text-[10px] text-white hover:bg-black/70"
          onClick={() => onToggleAvatar(!avatarEnabled)}
          aria-pressed={avatarEnabled}
          aria-label={avatarEnabled ? "Turn live avatar off" : "Turn live avatar on"}
        >
          {avatarEnabled ? (
            <Video className="size-3" />
          ) : (
            <VideoOff className="size-3" />
          )}
          {avatarEnabled ? "Live" : "Avatar off"}
        </Button>
        {sandbox && avatarEnabled && (
          <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-black">
            Sandbox
          </span>
        )}
      </div>

      {overlay && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-linear-to-t from-black/50 via-black/10 to-transparent" />
      )}
    </div>
  )
}
