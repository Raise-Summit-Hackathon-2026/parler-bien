"use client"

import confetti from "canvas-confetti"
import { Camera, Check, Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { GestureDemo } from "@/components/gesture-demo"
import { LevelStrip } from "@/components/level-strip"
import { SessionShell } from "@/components/session-shell"
import { Button } from "@/components/ui/button"
import { useGestureCamera } from "@/hooks/use-gesture-camera"
import { useSpeaker } from "@/hooks/use-speaker"
import {
  resolveCharacterGenderFromCharacter,
  resolveCharacterVoice,
  type Character,
} from "@/lib/character"
import {
  gestureHoldMs,
  type GestureStep,
} from "@/lib/gestures"
import { cn } from "@/lib/utils"

type GestureSessionProps = {
  character: Character
  steps: GestureStep[]
  holdMs?: number
  sessionTitle?: string
  winMessage: string
  levelIndex?: number
  levelTotal?: number
  onComplete?: () => void
  onBack: () => void
  backLabel?: string
  completeLabel?: string
  showLevelStrip?: boolean
}

type Phase = "demo" | "perform" | "won"

export function GestureSession({
  character,
  steps,
  holdMs,
  sessionTitle = "Safety demonstration",
  winMessage,
  levelIndex,
  levelTotal,
  onComplete,
  onBack,
  backLabel = "Back",
  completeLabel,
  showLevelStrip = true,
}: GestureSessionProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("demo")
  const { speak, stop } = useSpeaker()

  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex >= steps.length - 1

  useEffect(() => {
    if (phase !== "demo" || !currentStep) return
    const gender = resolveCharacterGenderFromCharacter(character)
    const voice = resolveCharacterVoice({ voice: character.voice }, gender)
    void speak(
      `${currentStep.title}. ${currentStep.instruction}`,
      "character",
      {
        gender,
        voice,
        ageRange: character.voice.ageRange,
        tone: character.voice.tone,
        deliveryStyle: character.deliveryStyle,
      },
    )
    return () => stop()
  }, [phase, stepIndex, currentStep, character, speak, stop])

  const handleGestureHeld = useCallback(() => {
    if (isLastStep) {
      setPhase("won")
      void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
    } else {
      setStepIndex((i) => i + 1)
      setPhase("demo")
    }
  }, [isLastStep])

  function handleComplete() {
    if (onComplete) {
      onComplete()
      return
    }
    onBack()
  }

  const {
    videoRef,
    canvasRef,
    ready,
    error,
    matching,
    holdProgress,
  } = useGestureCamera({
    active: phase === "perform" && Boolean(currentStep),
    targetKind: currentStep?.kind ?? null,
    holdMs: gestureHoldMs({ holdMs }),
    onGestureHeld: handleGestureHeld,
  })

  if (!currentStep && phase !== "won") return null

  return (
    <SessionShell onBack={onBack} backLabel={backLabel}>
      <div className="shrink-0 space-y-2 py-2">
        {showLevelStrip && levelIndex !== undefined && levelTotal !== undefined ? (
          <LevelStrip levels={character.levels} levelIndex={levelIndex} />
        ) : levelIndex !== undefined ? (
          <p className="text-center text-xs font-medium text-muted-foreground">
            Level {levelIndex + 1} · {sessionTitle}
          </p>
        ) : null}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{character.name}</p>
          {levelIndex === undefined && (
            <h1 className="text-lg font-semibold">{sessionTitle}</h1>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto rounded-2xl border bg-card p-4">
        {phase === "won" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check className="size-8" />
            </div>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              {winMessage}
            </p>
            <Button onClick={handleComplete}>
              {completeLabel ?? backLabel}
            </Button>
          </div>
        )}

        {phase === "demo" && currentStep && (
          <GestureDemo
            kind={currentStep.kind}
            title={currentStep.title}
            instruction={currentStep.instruction}
            stepIndex={stepIndex}
            totalSteps={steps.length}
            onContinue={() => setPhase("perform")}
          />
        )}

        {phase === "perform" && currentStep && (
          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-center text-sm font-medium">{currentStep.title}</p>
            <p className="text-center text-xs text-muted-foreground">
              {currentStep.instruction}
            </p>

            <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                className="size-full scale-x-[-1] object-cover"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 size-full scale-x-[-1]"
              />
              {!ready && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                  <Loader2 className="size-8 animate-spin" />
                </div>
              )}
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}

            {ready && (
              <>
                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-100",
                      matching ? "bg-emerald-500" : "bg-amber-400",
                    )}
                    style={{ width: `${holdProgress * 100}%` }}
                  />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Camera className="size-3.5" />
                  {matching
                    ? "Hold steady…"
                    : "Match the demo pose in frame"}
                </p>
              </>
            )}

            <Button variant="ghost" size="sm" onClick={() => setPhase("demo")}>
              Watch demo again
            </Button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 justify-center gap-2 py-3">
        {steps.map((step, i) => (
          <span
            key={step.id}
            className={cn(
              "size-2 rounded-full",
              i < stepIndex
                ? "bg-emerald-500"
                : i === stepIndex
                  ? "bg-primary"
                  : "bg-muted",
            )}
          />
        ))}
      </div>
    </SessionShell>
  )
}
