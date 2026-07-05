"use client"

import { ArrowRight, BriefcaseBusiness, Mic, Sparkles } from "lucide-react"
import Link from "next/link"

import { ScenarioScene } from "@/components/scenario-scene"
import { BUILT_IN_CHARACTERS } from "@/lib/characters/index"

export function HomeHero() {
  const heroCharacter =
    BUILT_IN_CHARACTERS.find((character) => character.id === "vendor") ??
    BUILT_IN_CHARACTERS[0]

  return (
    <section className="relative overflow-hidden border-b bg-background text-foreground dark:bg-[#05070a] dark:text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 18% 24%, rgba(132, 204, 22, 0.16), transparent 25%), radial-gradient(circle at 82% 28%, rgba(132, 204, 22, 0.1), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 35%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-80 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          maskImage:
            "linear-gradient(to top, black, transparent), radial-gradient(ellipse at center, black 0%, transparent 68%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 py-4 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-4">
        <div className="space-y-8">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-lime-700 uppercase dark:text-lime-300">
              <Mic className="size-3.5" />
              AI role-play coach
            </span>

            <div className="space-y-3">
              <h1 className="max-w-2xl text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                Practice real conversations.
                <span className="block text-lime-700 dark:text-lime-300">
                  Speak with confidence.
                </span>
              </h1>

              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base dark:text-white/65">
                Role-play real life scenarios with AI characters. Get instant
                feedback, improve faster, and speak naturally.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#free-play"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-lime-600 px-6 text-sm font-semibold text-white shadow-[0_0_32px_rgba(101,163,13,0.18)] transition-colors hover:bg-lime-700 dark:bg-lime-300 dark:text-black dark:shadow-[0_0_32px_rgba(190,242,100,0.22)] dark:hover:bg-lime-200"
            >
              <Sparkles className="size-4" />
              Start role-playing
            </Link>
            <Link
              href="/workspaces"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border bg-card px-6 text-sm font-medium transition-colors hover:bg-muted/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <BriefcaseBusiness className="size-4" />
              Explore workspaces
            </Link>
          </div>
        </div>

        {heroCharacter && (
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-lime-300/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border bg-card/70 p-3 shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-white/4 dark:shadow-black/50">
              <ScenarioScene
                scenarioId={heroCharacter.id}
                className="aspect-16/10 rounded-2xl"
              />
              <div className="absolute top-8 right-8 hidden w-52 space-y-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-sm shadow-xl backdrop-blur md:block">
                <div className="rounded-xl bg-lime-300/15 p-3">
                  <p className="text-[11px] font-medium text-lime-200">
                    Go ahead, start the conversation.
                  </p>
                </div>
                <div className="ml-auto max-w-36 rounded-xl bg-white/10 p-3 text-white/90">
                  <p>I’d like to book a table for two.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <p className="font-medium text-white">Great start.</p>
                  <p className="mt-1 text-xs text-white/55">
                    Try being a bit more specific.
                  </p>
                  <p className="mt-3 text-xs text-lime-200">Example</p>
                  <p className="text-xs text-white/75">
                    I’d like to book a table for two this Friday evening.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function WorkspacesCta() {
  return (
    <section className="border-t bg-background text-foreground dark:bg-[#05070a] dark:text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-6 py-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border bg-card p-6 dark:border-white/10 dark:bg-white/3">
          <h2 className="text-xl font-semibold">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              [
                "1",
                "Choose a scenario",
                "Pick a real life situation you want to practice.",
              ],
              [
                "2",
                "Role-play and speak",
                "Talk with the AI character in a realistic setting.",
              ],
              [
                "3",
                "Get feedback",
                "Receive personalized tips to improve your speaking.",
              ],
            ].map(([step, title, text]) => (
              <div key={step} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-lime-600/25 bg-lime-600/10 text-sm font-semibold text-lime-700 dark:border-lime-300/30 dark:bg-lime-300/10 dark:text-lime-300">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground dark:text-white/50">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-2xl border bg-card p-6 shadow-sm dark:border-white/10 dark:bg-white/3">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-lime-600 text-white dark:bg-lime-300 dark:text-black">
              <BriefcaseBusiness className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-xl font-semibold">Build your own role-plays</p>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground dark:text-white/55">
                Create a workspace, generate role-playing characters from a
                prompt or a PDF, and share them with your team via one link.
              </p>
            </div>
          </div>
          <Link
            href="/workspaces"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-lime-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-lime-700 dark:bg-lime-300 dark:text-black dark:hover:bg-lime-200"
          >
            Open workspaces
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
