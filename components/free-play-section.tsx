"use client"

import { useRouter } from "next/navigation"

import { ScenarioPicker } from "@/components/scenario-picker"

export function FreePlaySection() {
  const router = useRouter()

  return (
    <section id="free-play" className="scroll-mt-16 border-t bg-muted/20">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="mb-8 space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">Free play</h2>
          <p className="text-muted-foreground">
            Pick a scenario or create your own. Language and accent are in settings
            (top right).
          </p>
        </div>
        <div className="mb-6 space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Scenarios</h3>
          <p className="text-sm text-muted-foreground">
            Classic roleplays and custom scenarios you create.
          </p>
        </div>
        <ScenarioPicker
          onSelect={({ scenario, characterId }) => {
            const id = characterId ?? scenario.id
            router.push(`/play/${encodeURIComponent(id)}`)
          }}
        />
      </div>
    </section>
  )
}
