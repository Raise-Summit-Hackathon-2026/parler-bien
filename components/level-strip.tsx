import type { Level } from "@/lib/character"
import { cn } from "@/lib/utils"

type LevelStripProps = {
  levels: Level[]
  levelIndex: number
  className?: string
}

export function LevelStrip({ levels, levelIndex, className }: LevelStripProps) {
  const levelTotal = levels.length
  const current = levels[levelIndex]

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{current?.title}</span>
        <span className="tabular-nums">
          Level {levelIndex + 1} / {levelTotal}
        </span>
      </div>
      <div className="flex gap-1.5">
        {levels.map((level, index) => (
          <span
            key={level.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index < levelIndex
                ? "bg-emerald-500"
                : index === levelIndex
                  ? "bg-primary"
                  : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  )
}
