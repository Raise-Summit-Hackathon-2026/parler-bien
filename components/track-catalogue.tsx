"use client"

import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  Mic,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

import { useLanguage } from "@/components/language-provider"
import { ScenarioScene } from "@/components/scenario-scene"
import { getAgent } from "@/lib/agents"
import { COMPANY_HUBS, getStandaloneTracks } from "@/lib/companies"
import { getLanguage, getRegion } from "@/lib/languages"
import { countPlayableLevels, type LearningTrack } from "@/lib/tracks"
import { cn } from "@/lib/utils"

export function HomeHero() {
  const { languageId, regionId } = useLanguage()
  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  return (
    <section className="relative overflow-hidden border-b">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, var(--color-primary) 0, transparent 45%), radial-gradient(circle at 80% 0%, var(--color-primary) 0, transparent 40%)",
        }}
        aria-hidden
      />
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Mic className="size-3.5" />
          Speak · get scored · win the conversation
        </span>

        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Practice real conversations in {language.name}
        </h1>

        <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
          Roleplay with AI characters that talk back, score your pronunciation
          word by word, and push you toward a goal — from café orders to closing
          the deal.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="#free-play"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="size-4" />
            Start free play
          </Link>
          <Link
            href="#tracks"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-card px-6 text-sm font-medium transition-colors hover:bg-muted/60"
          >
            Explore tracks
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Now practicing {language.name} · {region.accent} · {region.city}
        </p>
      </div>
    </section>
  )
}

function TrackCard({ track }: { track: LearningTrack }) {
  const agent = getAgent(track.primaryAgentId)
  const levels = countPlayableLevels(track)

  return (
    <Link
      href={`/tracks/${track.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
      )}
    >
      <div className="relative">
        <ScenarioScene imagePrompt={agent.avatarPrompt} className="h-40 w-full rounded-none" />
        <span
          className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
          style={{ backgroundColor: `${track.themeColor}cc` }}
        >
          {levels} {levels === 1 ? "level" : "levels"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-lg font-semibold">{track.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {track.description}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-muted-foreground">
          with {agent.name}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export function TracksSection() {
  const tracks = getStandaloneTracks()

  return (
    <section id="tracks" className="scroll-mt-16">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="mb-6 space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Learning tracks</h2>
          <p className="text-muted-foreground">
            Guided level-by-level paths, each with a dedicated AI coach.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function TeamsSection() {
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Teams</h2>
            <p className="text-muted-foreground">
              Company academies with department-specific paths.
            </p>
          </div>
          <Link
            href="/teams"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all teams
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {COMPANY_HUBS.map((hub) => (
            <Link
              key={hub.id}
              href={`/teams/${hub.id}`}
              className={cn(
                "group relative overflow-hidden rounded-2xl border transition-all",
                "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
              )}
            >
              <ScenarioScene imagePrompt={hub.imagePrompt} className="h-48 w-full rounded-none" />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute right-0 bottom-0 left-0 p-5 text-white">
                <p className="text-xs font-medium tracking-wide uppercase opacity-80">
                  {hub.location}
                </p>
                <p className="text-xl font-semibold">{hub.name}</p>
                <p className="mt-1 line-clamp-2 text-sm opacity-90">
                  {hub.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function WorkspacesCta() {
  return (
    <section className="border-t">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="flex flex-col items-start gap-5 rounded-2xl border bg-card p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#1b1b18] text-white">
              <BriefcaseBusiness className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-xl font-semibold">Build your own workspace</p>
              <p className="max-w-xl text-sm text-muted-foreground">
                Define personas, upload guidelines, PDFs, and photos, then save
                and share a custom company workspace with your account.
              </p>
            </div>
          </div>
          <Link
            href="/workspaces"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Manage workspaces
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
