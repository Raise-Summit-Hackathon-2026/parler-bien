"use client"

import { ArrowLeft, Camera, Check, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getLevelStatus, countCompletedLevels } from "@/lib/track-progress"
import {
  countPlayableLevels,
  getTrackAgent,
  isGestureLevel,
  type LearningTrack,
  type TrackLevel,
} from "@/lib/tracks"
import { cn } from "@/lib/utils"

type LevelPathProps = {
  track: LearningTrack
  onBack: () => void
  onSelectLevel: (level: TrackLevel) => void
}

function LevelNode({
  level,
  status,
  themeColor,
  isLast,
  onSelect,
}: {
  level: TrackLevel
  status: ReturnType<typeof getLevelStatus>
  themeColor: string
  isLast: boolean
  onSelect: () => void
}) {
  const isWip = status === "wip"
  const isLocked = status === "locked"
  const isCompleted = status === "completed"
  const isCurrent = status === "available" || status === "in_progress"
  const isClickable = isCurrent || isCompleted

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        disabled={!isClickable || isWip}
        onClick={onSelect}
        className={cn(
          "relative flex w-full max-w-sm items-center gap-4 rounded-2xl border p-4 text-left transition-all",
          isClickable && !isWip && "hover:border-foreground/20 hover:shadow-sm",
          isCurrent && "border-2 shadow-sm",
          (isLocked || isWip) && "pointer-events-none opacity-50",
          isCompleted && "bg-emerald-500/5 border-emerald-500/30",
        )}
        style={
          isCurrent
            ? { borderColor: themeColor }
            : undefined
        }
      >
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all",
            isCompleted && "bg-emerald-500 text-white",
            isCurrent && "text-white",
            isLocked && "bg-muted text-muted-foreground",
            isWip && "bg-muted text-muted-foreground",
          )}
          style={
            isCurrent && !isCompleted
              ? { backgroundColor: themeColor, boxShadow: `0 0 0 4px ${themeColor}33` }
              : undefined
          }
        >
          {isCompleted ? (
            <Check className="size-5" />
          ) : isLocked ? (
            <Lock className="size-4" />
          ) : isWip ? (
            <span className="text-[10px] font-semibold uppercase">Soon</span>
          ) : (
            level.order
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{level.title}</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {isGestureLevel(level) && <Camera className="size-3.5 shrink-0" />}
            {level.subtitle}
          </p>
          {isWip && (
            <p className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Coming soon
            </p>
          )}
          {isLocked && (
            <p className="mt-1 text-xs text-muted-foreground">
              Complete the previous level to unlock
            </p>
          )}
        </div>
      </button>
      {!isLast && (
        <div
          className="my-1 h-8 w-0.5 border-l-2 border-dashed border-muted-foreground/30"
          aria-hidden
        />
      )}
    </div>
  )
}

export function LevelPath({ track, onBack, onSelectLevel }: LevelPathProps) {
  const agent = getTrackAgent(track)
  const completed = countCompletedLevels(track.id)
  const total = countPlayableLevels(track)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col gap-6 px-6 py-12">
      <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
        <ArrowLeft />
        Tracks
      </Button>

      <div className="space-y-2 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {track.title}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          with {agent.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {completed}/{total} levels complete
        </p>
        <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${total > 0 ? (completed / total) * 100 : 0}%`,
              backgroundColor: track.themeColor,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-0 py-4">
        {track.levels.map((level, index) => (
          <LevelNode
            key={level.id}
            level={level}
            status={getLevelStatus(track.id, level.id)}
            themeColor={track.themeColor}
            isLast={index === track.levels.length - 1}
            onSelect={() => onSelectLevel(level)}
          />
        ))}
      </div>
    </div>
  )
}
