"use client"

import { ArrowLeft, Check, ChevronRight } from "lucide-react"

import { ScenarioScene } from "@/components/scenario-scene"
import { Button } from "@/components/ui/button"
import { getAgent } from "@/lib/agents"
import {
  countCompanyProgress,
  getCompanyTracks,
  isCompanyTrackComplete,
  type CompanyHub,
} from "@/lib/companies"
import {
  countPlayableLevels,
  type LearningTrack,
} from "@/lib/tracks"
import { countCompletedLevels } from "@/lib/track-progress"
import { cn } from "@/lib/utils"

type CompanyHubPageProps = {
  hub: CompanyHub
  onBack: () => void
  onSelectTrack: (track: LearningTrack) => void
}

function DepartmentCard({
  track,
  onSelect,
}: {
  track: LearningTrack
  onSelect: () => void
}) {
  const agent = getAgent(track.primaryAgentId)
  const completed = countCompletedLevels(track.id)
  const total = countPlayableLevels(track)
  const done = completed >= total

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-all",
        "hover:border-foreground/20 hover:shadow-sm",
      )}
    >
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
        style={{ backgroundColor: track.themeColor }}
      >
        {completed}/{total}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{track.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {track.description}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">with {agent.name}</p>
      </div>
      {done ? (
        <Check className="size-5 shrink-0 text-emerald-500" />
      ) : (
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}

export function CompanyHubPage({
  hub,
  onBack,
  onSelectTrack,
}: CompanyHubPageProps) {
  const tracks = getCompanyTracks(hub)
  const { completed, total } = countCompanyProgress(hub)
  const allDone = isCompanyTrackComplete(hub)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col gap-6 px-6 py-10">
      <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
        <ArrowLeft />
        Paths
      </Button>

      <div className="relative overflow-hidden rounded-3xl border">
        <ScenarioScene imagePrompt={hub.imagePrompt} className="h-40 w-full" />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 p-5 text-white">
          <p className="text-xs font-medium tracking-wide uppercase opacity-80">
            {hub.location}
          </p>
          <h1 className="text-2xl font-semibold">{hub.name}</h1>
          <p className="mt-1 text-sm opacity-90">{hub.description}</p>
        </div>
        {allDone && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white">
            <Check className="size-3" />
            All paths complete
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Department paths</span>
          <span className="tabular-nums font-medium">
            {completed}/{total} levels
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${total > 0 ? (completed / total) * 100 : 0}%`,
              backgroundColor: hub.themeColor,
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {tracks.map((track) => (
          <DepartmentCard
            key={track.id}
            track={track}
            onSelect={() => onSelectTrack(track)}
          />
        ))}
      </div>
    </div>
  )
}
