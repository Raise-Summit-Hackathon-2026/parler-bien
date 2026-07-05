import { Lock } from "lucide-react"

import { isLevelPlayable, type Level } from "@/lib/character"
import { cn } from "@/lib/utils"

type LevelStripProps = {
  levels: Level[]
  levelIndex: number
  className?: string
}

export function LevelStrip({ levels, levelIndex, className }: LevelStripProps) {
  const current = levels[levelIndex]
  const playableCount = levels.filter(isLevelPlayable).length
  const playablePosition =
    levels.slice(0, levelIndex + 1).filter(isLevelPlayable).length

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{current?.title}</span>
        <span className="tabular-nums">
          Level {playablePosition} / {playableCount}
        </span>
      </div>
      <div className="flex gap-1.5">
        {levels.map((level, index) => {
          const locked = !isLevelPlayable(level)
          const completed =
            !locked && index < levelIndex && isLevelPlayable(levels[index]!)
          const active = index === levelIndex && !locked

          return (
            <span
              key={level.id}
              title={
                locked
                  ? `${level.title} — ${level.lockLabel ?? "Coming soon"}`
                  : level.title
              }
              className={cn(
                "relative h-1.5 flex-1 rounded-full transition-colors",
                locked
                  ? "bg-muted/50 opacity-40"
                  : completed
                    ? "bg-emerald-500"
                    : active
                      ? "bg-primary"
                      : "bg-muted",
              )}
            />
          )
        })}
      </div>
      {levels.some((l) => !isLevelPlayable(l)) && (
        <div className="flex flex-wrap gap-1.5">
          {levels.map((level, index) => {
            if (isLevelPlayable(level)) return null
            return (
              <span
                key={level.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
                  index === levelIndex && "border-primary/30 bg-muted/30",
                )}
              >
                <Lock className="size-2.5 shrink-0 opacity-60" />
                {level.title}
                <span className="opacity-70">· {level.lockLabel ?? "Coming soon"}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
