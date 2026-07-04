"use client"

import type { GestureKind } from "@/lib/gestures"
import { cn } from "@/lib/utils"

function DemoFigure({ kind }: { kind: GestureKind }) {
  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-muted/50">
      <svg viewBox="0 0 120 120" className="size-28 text-foreground/80">
        <circle cx="60" cy="28" r="14" fill="currentColor" opacity="0.9" />
        <line x1="60" y1="42" x2="60" y2="78" stroke="currentColor" strokeWidth="4" />
        {kind === "seatbelt" && (
          <>
            <line x1="38" y1="58" x2="82" y2="58" stroke="currentColor" strokeWidth="4" />
            <line x1="42" y1="68" x2="78" y2="68" stroke="currentColor" strokeWidth="3" opacity="0.6" />
          </>
        )}
        {kind === "point_exit" && (
          <>
            <line x1="60" y1="48" x2="88" y2="18" stroke="currentColor" strokeWidth="4" />
            <line x1="88" y1="18" x2="88" y2="8" stroke="currentColor" strokeWidth="5" />
          </>
        )}
        {kind === "palms_down" && (
          <>
            <line x1="60" y1="48" x2="32" y2="62" stroke="currentColor" strokeWidth="4" />
            <line x1="60" y1="48" x2="88" y2="62" stroke="currentColor" strokeWidth="4" />
            <line x1="28" y1="66" x2="36" y2="66" stroke="currentColor" strokeWidth="3" />
            <line x1="84" y1="66" x2="92" y2="66" stroke="currentColor" strokeWidth="3" />
          </>
        )}
        <line x1="60" y1="78" x2="44" y2="108" stroke="currentColor" strokeWidth="4" />
        <line x1="60" y1="78" x2="76" y2="108" stroke="currentColor" strokeWidth="4" />
      </svg>
    </div>
  )
}

type GestureDemoProps = {
  kind: GestureKind
  title: string
  instruction: string
  stepIndex: number
  totalSteps: number
  onContinue: () => void
}

export function GestureDemo({
  kind,
  title,
  instruction,
  stepIndex,
  totalSteps,
  onContinue,
}: GestureDemoProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-xs font-medium text-muted-foreground">
        Demo {stepIndex + 1} / {totalSteps}
      </p>
      <DemoFigure kind={kind} />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{instruction}</p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className={cn(
          "mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground",
          "transition-opacity hover:opacity-90",
        )}
      >
        I&apos;m ready — use my camera
      </button>
    </div>
  )
}
