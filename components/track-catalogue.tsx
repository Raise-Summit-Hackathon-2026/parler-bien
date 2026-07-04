"use client"

import { ArrowRight, BriefcaseBusiness, Mic, Sparkles } from "lucide-react"
import Link from "next/link"

import { useLanguage } from "@/components/language-provider"
import { getLanguage, getRegion } from "@/lib/languages"

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
          Build company workspaces with personas, learning tracks, and levels —
          then practice roleplays with AI feedback word by word.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#free-play"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="size-4" />
            Start free play
          </Link>
          <Link
            href="/workspaces"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-card px-6 text-sm font-medium transition-colors hover:bg-muted/60"
          >
            <BriefcaseBusiness className="size-4" />
            Open workspaces
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Now practicing {language.name} · {region.accent} · {region.city}
        </p>
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
              <p className="text-xl font-semibold">Build your training workspace</p>
              <p className="max-w-xl text-sm text-muted-foreground">
                Define personas with full voice and coaching settings, create
                tracks with ordered levels, and configure pass criteria — goal
                meters, pronunciation scores, gestures, and more.
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
