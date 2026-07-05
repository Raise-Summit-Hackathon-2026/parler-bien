"use client"

import { Camera, Check, Lock, Mic, Sparkles, Star, Trophy } from "lucide-react"
import { useMemo } from "react"

import { useLanguage } from "@/components/language-provider"
import {
  localizedCharacterMeta,
  localizedLevelCopy,
  type Character,
  type Level,
} from "@/lib/character"
import type { LanguageId } from "@/lib/languages"
import {
  getLevelPathState,
  trackProgressSummary,
  type LevelPathState,
} from "@/lib/level-progress"
import { cn } from "@/lib/utils"

type LevelPathProps = {
  character: Character
  completedLevelIds: string[]
  activeLevelIndex: number
  onSelectLevel: (index: number) => void
  className?: string
}

/* Design-space layout: the SVG viewBox and node positions share these units. */
const TRACK_W = 340
const ROW_H = 150
const TOP_PAD = 64
const BOTTOM_PAD = 84
const AMPLITUDE = 88
const CENTER_X = TRACK_W / 2

function levelIcon(level: Level) {
  if (level.kind === "gesture") return Camera
  if (level.kind === "voice" && level.mode === "coach") return Mic
  return Mic
}

function nodeX(index: number) {
  // Serpentine: center → right → center → left → center …
  return CENTER_X + AMPLITUDE * Math.sin((index * Math.PI) / 2)
}

function nodeY(index: number) {
  return TOP_PAD + index * ROW_H
}

/** Smooth cubic path through a list of points. */
function trailPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ""
  let d = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!
    const curr = points[i]!
    const bend = (curr.y - prev.y) * 0.55
    d += ` C ${prev.x} ${prev.y + bend}, ${curr.x} ${curr.y - bend}, ${curr.x} ${curr.y}`
  }
  return d
}

function StartBubble() {
  return (
    <div className="lp-bob pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2">
      <div className="relative rounded-xl border-2 border-indigo-500/60 bg-background px-3 py-1 shadow-lg shadow-indigo-500/20">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-500">
          Start
        </span>
        <div className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-indigo-500/60 bg-background" />
      </div>
    </div>
  )
}

function SparkleField() {
  return (
    <>
      <Sparkles
        className="lp-sparkle pointer-events-none absolute -left-6 top-0 size-3.5 text-amber-400"
        style={{ "--lp-delay": "0s" } as React.CSSProperties}
      />
      <Sparkles
        className="lp-sparkle pointer-events-none absolute -right-7 top-4 size-3 text-indigo-400"
        style={{ "--lp-delay": "0.9s" } as React.CSSProperties}
      />
      <Sparkles
        className="lp-sparkle pointer-events-none absolute -bottom-2 -left-4 size-2.5 text-fuchsia-400"
        style={{ "--lp-delay": "1.7s" } as React.CSSProperties}
      />
    </>
  )
}

function LevelNode({
  level,
  languageId,
  state,
  index,
  onSelect,
}: {
  level: Level
  languageId: LanguageId
  state: LevelPathState
  index: number
  onSelect: () => void
}) {
  const Icon = levelIcon(level)
  const copy = localizedLevelCopy(level, languageId)
  const comingSoon = state === "coming-soon"
  const locked = state === "locked"
  const isCurrent = state === "current"
  // Locked levels look disabled but remain clickable for demo skip-ahead.
  const navigable =
    state === "completed" || state === "current" || state === "unlocked" || locked

  const x = nodeX(index)
  const y = nodeY(index)

  return (
    <div
      className="lp-node-pop absolute flex w-[150px] -translate-x-1/2 flex-col items-center"
      style={
        {
          left: `${(x / TRACK_W) * 100}%`,
          top: y,
          "--lp-i": index,
          marginTop: "-32px",
        } as React.CSSProperties
      }
    >
      <div className="relative">
        {isCurrent && (
          <>
            <div className="lp-halo pointer-events-none absolute -inset-2 rounded-full bg-indigo-500/40 blur-md" />
            <SparkleField />
            <StartBubble />
          </>
        )}

        <button
          type="button"
          disabled={comingSoon}
          onClick={navigable ? onSelect : undefined}
          aria-label={copy.title}
          title={
            comingSoon
              ? `${copy.title} — ${level.lockLabel ?? "Coming soon"}`
              : locked
                ? "Complete the previous level to unlock"
                : copy.title
          }
          className={cn(
            "group relative flex size-16 items-center justify-center rounded-full transition-all duration-150",
            isCurrent && "lp-beat",
            navigable && !locked && "cursor-pointer",
            (locked || comingSoon) && "cursor-not-allowed",

            state === "completed" &&
              "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_5px_0_theme(colors.emerald.700)] active:translate-y-[4px] active:shadow-[0_1px_0_theme(colors.emerald.700)]",

            isCurrent &&
              "bg-gradient-to-b from-violet-500 to-indigo-600 text-white shadow-[0_5px_0_theme(colors.indigo.800)] ring-4 ring-indigo-500/25 active:translate-y-[4px] active:shadow-[0_1px_0_theme(colors.indigo.800)]",

            state === "unlocked" &&
              "border-2 border-indigo-400/60 bg-background text-indigo-500 shadow-[0_5px_0_theme(colors.indigo.200)] hover:border-indigo-500 active:translate-y-[4px] active:shadow-[0_1px_0_theme(colors.indigo.200)] dark:shadow-[0_5px_0_theme(colors.indigo.950)]",

            locked &&
              "border-2 border-muted-foreground/25 bg-muted/70 text-muted-foreground shadow-[0_4px_0_theme(colors.border)]",

            comingSoon &&
              "border-2 border-dashed border-muted-foreground/35 bg-muted/40 text-muted-foreground/60",
          )}
        >
          {/* glossy top highlight */}
          {(state === "completed" || isCurrent) && (
            <span className="pointer-events-none absolute inset-x-3 top-1.5 h-4 rounded-full bg-white/25 blur-[3px]" />
          )}

          {/* shine sweep on completed */}
          {state === "completed" && (
            <span className="lp-shimmer pointer-events-none absolute inset-0 rounded-full opacity-40" />
          )}

          {state === "completed" ? (
            <Check className="size-7 stroke-[3]" />
          ) : locked || comingSoon ? (
            <Lock className="size-5" />
          ) : (
            <Icon className="size-6" />
          )}

          <span
            className={cn(
              "absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full text-[10px] font-extrabold tabular-nums ring-2",
              state === "completed" && "bg-emerald-700 text-white ring-emerald-300",
              isCurrent && "bg-indigo-800 text-white ring-indigo-300",
              state === "unlocked" && "bg-background text-indigo-500 ring-indigo-300",
              (locked || comingSoon) && "bg-background text-muted-foreground ring-border",
            )}
          >
            {index + 1}
          </span>
        </button>
      </div>

      <div className="mt-1.5 max-w-[150px] text-center">
        <p
          className={cn(
            "line-clamp-1 text-xs font-bold leading-tight",
            isCurrent && "text-indigo-500",
            (locked || comingSoon) && "text-muted-foreground/70",
          )}
        >
          {copy.title}
        </p>
        <p className="line-clamp-1 text-[10px] text-muted-foreground">
          {comingSoon ? (level.lockLabel ?? "Coming soon") : copy.subtitle}
        </p>
      </div>
    </div>
  )
}

function TrophyNode({ done, index }: { done: boolean; index: number }) {
  const x = nodeX(index)
  const y = nodeY(index)

  return (
    <div
      className="lp-node-pop absolute flex -translate-x-1/2 flex-col items-center"
      style={
        {
          left: `${(x / TRACK_W) * 100}%`,
          top: y,
          "--lp-i": index,
          marginTop: "-32px",
        } as React.CSSProperties
      }
    >
      <div className="relative">
        {done && (
          <div className="lp-halo pointer-events-none absolute -inset-2 rounded-full bg-amber-400/50 blur-md" />
        )}
        <div
          className={cn(
            "relative flex size-16 items-center justify-center rounded-full",
            done
              ? "lp-beat bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-[0_5px_0_theme(colors.amber.600)] ring-4 ring-amber-400/30"
              : "border-2 border-dashed border-border bg-muted/30 text-muted-foreground/50",
          )}
        >
          {done && (
            <span className="pointer-events-none absolute inset-x-3 top-1.5 h-4 rounded-full bg-white/30 blur-[3px]" />
          )}
          <Trophy className={cn("size-7", done && "fill-white/30")} />
        </div>
      </div>
      <p
        className={cn(
          "mt-1.5 text-xs font-bold",
          done ? "text-amber-500" : "text-muted-foreground/70",
        )}
      >
        {done ? "Track mastered!" : "Finish"}
      </p>
    </div>
  )
}

export function LevelPath({
  character,
  completedLevelIds,
  activeLevelIndex,
  onSelectLevel,
  className,
}: LevelPathProps) {
  const { languageId } = useLanguage()
  const meta = localizedCharacterMeta(character, languageId)
  const { completed, total } = trackProgressSummary(character, completedLevelIds)
  const allDone = completed === total && total > 0
  const progressPct = total > 0 ? (completed / total) * 100 : 0

  const states = useMemo(
    () =>
      character.levels.map((level, index) =>
        getLevelPathState(character, level, index, activeLevelIndex, completedLevelIds),
      ),
    [character, activeLevelIndex, completedLevelIds],
  )

  const trophyIndex = character.levels.length
  const trackHeight = TOP_PAD + trophyIndex * ROW_H + BOTTOM_PAD

  const points = useMemo(
    () =>
      Array.from({ length: trophyIndex + 1 }, (_, i) => ({
        x: nodeX(i),
        y: nodeY(i),
      })),
    [trophyIndex],
  )

  // The lit trail reaches the furthest node the player can stand on.
  const litUntil = useMemo(() => {
    let last = 0
    states.forEach((state, i) => {
      if (state === "completed" || state === "current") last = i
    })
    if (allDone) return trophyIndex
    return last
  }, [states, allDone, trophyIndex])

  const fullTrail = trailPath(points)
  const litTrail = trailPath(points.slice(0, litUntil + 1))

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5 text-center">
        <h1 className="text-lg font-bold leading-tight">{meta.name}</h1>
        <p className="text-xs text-muted-foreground">{meta.tagline}</p>

        <div className="mx-auto flex max-w-[240px] items-center gap-2 pt-1">
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/60">
            <div
              className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 transition-[width] duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            >
              <span className="lp-shimmer absolute inset-0" />
            </div>
          </div>
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
            {completed}/{total}
          </span>
          {allDone && <Star className="size-4 fill-amber-400 text-amber-400" />}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[340px]" style={{ height: trackHeight }}>
        {/* Trail */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${TRACK_W} ${trackHeight}`}
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="lp-lit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-emerald-500, #10b981)" />
              <stop offset="100%" stopColor="var(--color-indigo-500, #6366f1)" />
            </linearGradient>
          </defs>

          {/* dotted base trail */}
          <path
            d={fullTrail}
            stroke="currentColor"
            className="text-muted-foreground/35"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="0.5 14"
          />

          {/* lit trail */}
          {litUntil > 0 && (
            <>
              <path
                d={litTrail}
                stroke="url(#lp-lit)"
                strokeWidth={7}
                strokeLinecap="round"
                opacity={0.85}
              />
              {/* flowing energy dots */}
              <path
                d={litTrail}
                stroke="white"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="1 18"
                opacity={0.9}
                className="lp-trail-flow"
              />
            </>
          )}
        </svg>

        {character.levels.map((level, index) => (
          <LevelNode
            key={level.id}
            level={level}
            languageId={languageId}
            state={states[index]!}
            index={index}
            onSelect={() => onSelectLevel(index)}
          />
        ))}

        <TrophyNode done={allDone} index={trophyIndex} />
      </div>
    </div>
  )
}
