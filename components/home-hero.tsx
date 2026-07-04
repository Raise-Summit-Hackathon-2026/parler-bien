"use client"

import { ArrowRight, BriefcaseBusiness, Mic, Sparkles } from "lucide-react"
import Link from "next/link"

export function HomeHero() {
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
          Talk your way to any skill.
        </h1>

        <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
          Voice-first training with AI characters, from languages to leadership.
          Speak — they listen, respond in character, and coach you word by word.
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
              <p className="text-xl font-semibold">Build your own characters</p>
              <p className="max-w-xl text-sm text-muted-foreground">
                Everything above was built with the same engine. Create a
                workspace, generate characters from a prompt or a PDF, and share
                them with your team via one link.
              </p>
            </div>
          </div>
          <Link
            href="/workspaces"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open workspaces
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
