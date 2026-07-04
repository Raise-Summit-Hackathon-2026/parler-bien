"use client"

import { ArrowLeft, Camera, Check, Lock } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import {
  fetchLevelProgress,
  getLevelStatusFromProgress,
} from "@/lib/workspace-progress"
import type {
  LevelStatus,
  WorkspaceLevelProgressRow,
  WorkspaceLevelRow,
  WorkspaceTrackRow,
} from "@/lib/workspace-types"
import { getPlayableLevels } from "@/lib/workspace-types"
import { cn } from "@/lib/utils"

type WorkspaceLevelPathProps = {
  workspaceId: string
  track: WorkspaceTrackRow
  levels: WorkspaceLevelRow[]
}

function LevelNode({
  level,
  status,
  themeColor,
  isLast,
  href,
}: {
  level: WorkspaceLevelRow
  status: LevelStatus
  themeColor: string
  isLast: boolean
  href: string
}) {
  const isDraft = status === "draft"
  const isLocked = status === "locked"
  const isCompleted = status === "completed"
  const isCurrent = status === "available" || status === "in_progress"
  const isClickable = isCurrent || isCompleted

  const content = (
    <div
      className={cn(
        "relative flex w-full max-w-sm items-center gap-4 rounded-2xl border p-4 text-left transition-all",
        isClickable && !isDraft && "hover:border-foreground/20 hover:shadow-sm",
        isCurrent && "border-2 shadow-sm",
        (isLocked || isDraft) && "pointer-events-none opacity-50",
        isCompleted && "border-emerald-500/30 bg-emerald-500/5",
      )}
      style={isCurrent ? { borderColor: themeColor } : undefined}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          isCompleted && "bg-emerald-500 text-white",
          isCurrent && "text-white",
          isLocked && "bg-muted text-muted-foreground",
          isDraft && "bg-muted text-muted-foreground",
        )}
        style={
          isCurrent && !isCompleted
            ? {
                backgroundColor: themeColor,
                boxShadow: `0 0 0 4px ${themeColor}33`,
              }
            : undefined
        }
      >
        {isCompleted ? (
          <Check className="size-5" />
        ) : isLocked ? (
          <Lock className="size-4" />
        ) : isDraft ? (
          <span className="text-[10px] font-semibold uppercase">Draft</span>
        ) : level.pass_criteria.type === "gesture" ? (
          <Camera className="size-4" />
        ) : (
          level.position
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{level.title}</p>
        <p className="text-sm text-muted-foreground">{level.subtitle}</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center">
      {isClickable && !isDraft ? (
        <Link href={href} className="w-full max-w-sm">
          {content}
        </Link>
      ) : (
        content
      )}
      {!isLast && (
        <div
          className="my-1 h-8 w-0.5 border-l-2 border-dashed border-muted-foreground/30"
          aria-hidden
        />
      )}
    </div>
  )
}

export function WorkspaceLevelPath({
  workspaceId,
  track,
  levels,
}: WorkspaceLevelPathProps) {
  const [progress, setProgress] = useState<
    Record<string, WorkspaceLevelProgressRow>
  >({})

  const sorted = [...levels].sort((a, b) => a.position - b.position)
  const playable = getPlayableLevels(sorted)
  const completed = playable.filter(
    (l) => getLevelStatusFromProgress(l, progress, sorted) === "completed",
  ).length

  useEffect(() => {
    void fetchLevelProgress(sorted.map((l) => l.id)).then(setProgress)
  }, [sorted])

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-12">
      <Link
        href={`/workspaces/${workspaceId}`}
        className="inline-flex h-7 items-center gap-1 self-start rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Workspace
      </Link>

      <div className="space-y-2 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {track.title}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{track.description}</h1>
        <p className="text-sm text-muted-foreground">
          {completed}/{playable.length} levels complete
        </p>
        <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${playable.length > 0 ? (completed / playable.length) * 100 : 0}%`,
              backgroundColor: track.theme_color,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-0 py-4">
        {sorted.map((level, index) => (
          <LevelNode
            key={level.id}
            level={level}
            status={getLevelStatusFromProgress(level, progress, sorted)}
            themeColor={track.theme_color}
            isLast={index === sorted.length - 1}
            href={`/workspaces/${workspaceId}/tracks/${track.id}/levels/${level.id}`}
          />
        ))}
      </div>
    </div>
  )
}
