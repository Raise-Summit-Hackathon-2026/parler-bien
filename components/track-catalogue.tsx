"use client"

import { Check, ChevronRight } from "lucide-react"

import { ScenarioScene } from "@/components/scenario-scene"
import { LanguagePicker } from "@/components/language-picker"
import { getAgent, getAgentTypeLabel } from "@/lib/agents"
import { getLanguage, getRegion, type LanguageId, type RegionId } from "@/lib/languages"
import {
  countCompanyProgress,
  COMPANY_HUBS,
  getCompanyTracks,
  getStandaloneTracks,
  isCompanyTrackComplete,
  type CompanyHub,
} from "@/lib/companies"
import {
  countCompletedLevels,
  isTrackComplete,
} from "@/lib/track-progress"
import { countPlayableLevels, type LearningTrack } from "@/lib/tracks"
import { cn } from "@/lib/utils"

type TrackCatalogueProps = {
  languageId: LanguageId
  regionId: RegionId
  onLanguageChange: (languageId: LanguageId) => void
  onRegionChange: (regionId: RegionId) => void
  onSelectTrack: (track: LearningTrack) => void
  onSelectCompany: (hub: CompanyHub) => void
  onFreePlay: () => void
}

function ProgressRing({
  completed,
  total,
  color,
}: {
  completed: number
  total: number
  color: string
}) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? completed / total : 0
  const offset = circumference * (1 - progress)

  return (
    <div className="relative size-11 shrink-0">
      <svg className="size-11 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/60"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums">
        {completed}/{total}
      </span>
    </div>
  )
}

function TrackCard({
  track,
  onSelect,
}: {
  track: LearningTrack
  onSelect: () => void
}) {
  const agent = getAgent(track.primaryAgentId)
  const completed = countCompletedLevels(track.id)
  const total = countPlayableLevels(track)
  const complete = isTrackComplete(track.id)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-all",
        "hover:border-foreground/20 hover:shadow-md",
      )}
    >
      <div className="relative">
        <ScenarioScene
          imagePrompt={agent.avatarPrompt}
          className="h-36 w-full"
        />
        {complete && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            <Check className="size-3" />
            Complete
          </span>
        )}
        <span
          className="absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
          style={{ backgroundColor: `${track.themeColor}cc` }}
        >
          {getAgentTypeLabel(agent.type)}
        </span>
      </div>
      <div className="flex flex-1 items-start gap-3 p-4">
        <ProgressRing
          completed={completed}
          total={total}
          color={track.themeColor}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold leading-tight">{track.title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {track.description}
          </p>
          <p className="text-xs text-muted-foreground">
            with {agent.name} · ~{track.estimatedMinutes} min
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {agent.skills.slice(0, 3).map((skill) => (
              <span
                key={skill.id}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {skill.label}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  )
}

function CompanyHubCard({
  hub,
  onSelect,
}: {
  hub: CompanyHub
  onSelect: () => void
}) {
  const { completed, total } = countCompanyProgress(hub)
  const tracks = getCompanyTracks(hub)
  const allDone = isCompanyTrackComplete(hub)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group col-span-full flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-all sm:flex-row",
        "hover:border-foreground/20 hover:shadow-md",
      )}
    >
      <ScenarioScene
        imagePrompt={hub.imagePrompt}
        className="h-36 w-full shrink-0 sm:h-auto sm:w-48"
      />
      <div className="flex flex-1 items-start gap-3 p-4">
        <ProgressRing completed={completed} total={total} color={hub.themeColor} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Company programme · {tracks.length} paths
          </p>
          <p className="font-semibold leading-tight">{hub.name}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{hub.description}</p>
          <p className="text-xs text-muted-foreground">{hub.location}</p>
        </div>
        {allDone ? (
          <Check className="mt-1 size-5 shrink-0 text-emerald-500" />
        ) : (
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        )}
      </div>
    </button>
  )
}

export function TrackCatalogue({
  languageId,
  regionId,
  onLanguageChange,
  onRegionChange,
  onSelectTrack,
  onSelectCompany,
  onFreePlay,
}: TrackCatalogueProps) {
  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="space-y-4 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Parler Bien
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose your path
        </h1>
        <p className="text-muted-foreground">
          Guided voice tracks with expert agents. Unlock levels as you progress.
        </p>
        <LanguagePicker
          languageId={languageId}
          regionId={regionId}
          onLanguageChange={onLanguageChange}
          onRegionChange={onRegionChange}
        />
        <p className="text-xs text-muted-foreground">
          {language.name} · {region.accent} · {region.city}
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COMPANY_HUBS.map((hub) => (
          <CompanyHubCard
            key={hub.id}
            hub={hub}
            onSelect={() => onSelectCompany(hub)}
          />
        ))}
        {getStandaloneTracks().map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            onSelect={() => onSelectTrack(track)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onFreePlay}
        className={cn(
          "flex w-full max-w-md items-center justify-between rounded-2xl border border-dashed bg-muted/20 px-5 py-4 text-left transition-all",
          "hover:border-foreground/30 hover:bg-muted/40",
        )}
      >
        <div>
          <p className="font-semibold">Free play</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Jump into any scenario — no unlock required
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </button>
    </div>
  )
}
