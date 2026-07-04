"use client"

import { ArrowLeft, ArrowRight, Play } from "lucide-react"
import Link from "next/link"
import { useCallback, useState } from "react"

import { PracticeSession } from "@/components/practice-session"
import { ScenarioScene } from "@/components/scenario-scene"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DEMO_BEATS,
  DEMO_CLOSE,
  DEMO_HOOK,
  type DemoBeat,
} from "@/lib/demo"
import { LINGUA_TRAINERS } from "@/lib/lingua-trainers"
import { getScenario, type BuiltInScenarioId, type Scenario } from "@/lib/scenarios"
import { cn } from "@/lib/utils"

type DemoPhase = "intro" | "beat" | "close"

const DEMO_CLOSE_SCENES: BuiltInScenarioId[] = ["sales_pitch", "vendor", "vc_lingua"]

function resolveDemoScenario(beat: DemoBeat): Scenario {
  if (beat.id === "vendor") {
    return getScenario("vendor")
  }
  return LINGUA_TRAINERS.find((t) => t.id === beat.id) ?? getScenario(beat.id)
}

function BeatProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {DEMO_BEATS.map((beat, index) => (
        <div
          key={`${beat.id}-${index}`}
          className={cn(
            "h-1.5 rounded-full transition-all",
            index === current ? "w-8 bg-primary" : "w-4 bg-muted",
            index < current && "bg-primary/40",
          )}
          aria-hidden
        />
      ))}
    </div>
  )
}

function DemoCueBanner({ beat }: { beat: DemoBeat }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left">
      <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
        Demo · {beat.moment} · ~{beat.durationSeconds}s
      </p>
      <p className="mt-1 text-sm text-foreground">{beat.presenterCue}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Second take: {beat.secondTakeTip}
      </p>
    </div>
  )
}

function PitchHookComparison() {
  return (
    <div className="w-full space-y-3 rounded-3xl border bg-card p-6 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-rose-600 uppercase dark:text-rose-400">
        Weak delivery
      </p>
      <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-foreground">
        {DEMO_HOOK.weakLine}
      </p>
      <p className="text-xs font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
        Strong delivery
      </p>
      <p className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-medium text-foreground">
        {DEMO_HOOK.strongLine}
      </p>
    </div>
  )
}

export function DemoRunner() {
  const [phase, setPhase] = useState<DemoPhase>("intro")
  const [beatIndex, setBeatIndex] = useState(0)

  const currentBeat = DEMO_BEATS[beatIndex]

  const handleBeatDone = useCallback(() => {
    if (beatIndex < DEMO_BEATS.length - 1) {
      setBeatIndex((i) => i + 1)
    } else {
      setPhase("close")
    }
  }, [beatIndex])

  const handleSkipToBeat = useCallback((index: number) => {
    setBeatIndex(index)
    setPhase("beat")
  }, [])

  if (phase === "intro") {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-6 px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Scenarios
        </Link>

        <div className="w-full space-y-4 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Hackathon Demo
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{DEMO_HOOK.headline}</h1>
          <p className="text-muted-foreground">{DEMO_HOOK.subline}</p>
        </div>

        <PitchHookComparison />

        <div className="flex w-full flex-col gap-3">
          <Button size="lg" className="w-full" onClick={() => setPhase("beat")}>
            <Play />
            Start demo — Cold open
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {DEMO_BEATS.map((b) => b.title).join(" → ")}
          </p>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-3">
          {DEMO_BEATS.map((beat, index) => (
            <button
              key={`${beat.id}-${index}`}
              type="button"
              onClick={() => handleSkipToBeat(index)}
              className="rounded-2xl border bg-muted/30 p-3 text-left text-sm transition-colors hover:bg-muted/60"
            >
              <p className="font-medium">{beat.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{beat.moment}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === "close") {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="space-y-4 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {DEMO_CLOSE.headline}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{DEMO_CLOSE.tagline}</h1>
          <p className="text-muted-foreground">{DEMO_CLOSE.oneLiner}</p>
        </div>

        <div className="grid w-full grid-cols-3 gap-3">
          {DEMO_CLOSE_SCENES.map((id) => (
            <div key={id} className="overflow-hidden rounded-2xl border">
              <ScenarioScene scenarioId={id} className="h-20 w-full" />
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2">
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Back to all scenarios
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setBeatIndex(0)
              setPhase("intro")
            }}
          >
            Replay demo
          </Button>
        </div>
      </div>
    )
  }

  if (!currentBeat) return null

  const scenario = resolveDemoScenario(currentBeat)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (beatIndex === 0 ? setPhase("intro") : setBeatIndex((i) => i - 1))}
        >
          <ArrowLeft />
          {beatIndex === 0 ? "Hook" : "Previous"}
        </Button>
        <BeatProgress current={beatIndex} />
        <Button variant="ghost" size="sm" onClick={handleBeatDone}>
          {beatIndex < DEMO_BEATS.length - 1 ? "Skip beat" : "Finish"}
          <ArrowRight />
        </Button>
      </div>

      <DemoCueBanner beat={currentBeat} />

      <PracticeSession
        key={`demo-${beatIndex}-${currentBeat.starter.text}`}
        scenario={scenario}
        languageId={currentBeat.languageId ?? "en"}
        regionId={currentBeat.regionId ?? "en-US"}
        onLanguageChange={() => {}}
        onRegionChange={() => {}}
        onBack={() => setPhase("intro")}
        demo={{
          beat: currentBeat,
          beatIndex,
          beatCount: DEMO_BEATS.length,
          onNextBeat: handleBeatDone,
        }}
      />
    </div>
  )
}
