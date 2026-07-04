"use client"

import { BriefcaseBusiness, ChevronRight, Sparkles } from "lucide-react"

import { LanguagePicker } from "@/components/language-picker"
import { getLanguage, getRegion, type LanguageId, type RegionId } from "@/lib/languages"
import type { CompanyHub } from "@/lib/companies"
import type { LearningTrack } from "@/lib/tracks"
import { cn } from "@/lib/utils"

type TrackCatalogueProps = {
  languageId: LanguageId
  regionId: RegionId
  onLanguageChange: (languageId: LanguageId) => void
  onRegionChange: (regionId: RegionId) => void
  onSelectTrack: (track: LearningTrack) => void
  onSelectCompany: (hub: CompanyHub) => void
  onFreePlay: () => void
  onWorkspaces: () => void
}

export function TrackCatalogue({
  languageId,
  regionId,
  onLanguageChange,
  onRegionChange,
  onSelectTrack,
  onSelectCompany,
  onFreePlay,
  onWorkspaces,
}: TrackCatalogueProps) {
  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)
  void onSelectTrack
  void onSelectCompany

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="space-y-4 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Parler Bien
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Build roleplays from your own context
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Start with free play, or save a company workspace with personas,
          guidelines, PDFs, files, and photos.
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

      <div className="grid w-full gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={onFreePlay}
          className={cn(
            "group flex min-h-56 flex-col justify-between rounded-lg border bg-card p-6 text-left shadow-sm transition-all",
            "hover:border-foreground/20 hover:shadow-md",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-xl font-semibold">Free play</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate and practice any scenario without joining a hard-coded team.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            Start practice
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <button
          type="button"
          onClick={onWorkspaces}
          className={cn(
            "group flex min-h-56 flex-col justify-between rounded-lg border bg-card p-6 text-left shadow-sm transition-all",
            "hover:border-foreground/20 hover:shadow-md",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-lg bg-[#1b1b18] text-white">
            <BriefcaseBusiness className="size-5" />
          </span>
          <div>
            <p className="text-xl font-semibold">Workspaces</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a company workspace, define personas, upload guidelines,
              and save/share the result to your account.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            Manage workspaces
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>
    </div>
  )
}
