import { Volume2 } from "lucide-react"

import type { SentenceSuggestion, WordScore } from "@/lib/types"
import { cn } from "@/lib/utils"

export function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}

export function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10 ring-emerald-500/20"
  if (score >= 60) return "bg-amber-500/10 ring-amber-500/20"
  return "bg-rose-500/10 ring-rose-500/20"
}

export function meterColor(meter: number) {
  if (meter >= 80) return "bg-emerald-500"
  if (meter >= 50) return "bg-amber-500"
  return "bg-rose-500"
}

export function WordChip({
  word,
  selected,
  onSelect,
}: {
  word: WordScore
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-lg font-medium ring-1 transition-all",
        scoreBg(word.score),
        scoreColor(word.score),
        selected && "ring-2 ring-foreground/30"
      )}
    >
      <Volume2 className="size-3.5 opacity-60" />
      {word.word}
    </button>
  )
}

export function ExampleSuggestionCard({
  sentence,
  onSelect,
}: {
  sentence: SentenceSuggestion
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-xl border border-dashed bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
    >
      <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        Try saying
      </p>
      <p className="mt-1.5 text-sm font-medium leading-snug">{sentence.text}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sentence.hint}</p>
    </button>
  )
}

export function MeterBar({
  meter,
  label,
  goal,
}: {
  meter: number
  label: string
  goal?: string | null
}) {
  const clamped = Math.max(0, Math.min(100, meter))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{clamped}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            meterColor(clamped)
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {goal && <p className="text-xs text-muted-foreground">Goal: {goal}</p>}
    </div>
  )
}

