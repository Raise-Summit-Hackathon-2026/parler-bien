"use client"

import { useRouter } from "next/navigation"

import { RegionPicker } from "@/components/region-picker"
import { ScenarioPicker } from "@/components/scenario-picker"
import { isBuiltInScenarioId } from "@/lib/scenarios"

export function FreePlaySection() {
  const router = useRouter()

  return (
    <section id="free-play" className="scroll-mt-16 border-t bg-muted/20">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="mb-8 space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">Free play</h2>
          <p className="text-muted-foreground">
            Pick a scenario or create your own. Change accent below if needed.
          </p>
          <RegionPicker />
        </div>
        <ScenarioPicker
          onSelect={({ scenario, characterId }) => {
            if (characterId) {
              router.push(`/play/character/${characterId}`)
              return
            }

            if (isBuiltInScenarioId(scenario.id)) {
              router.push(`/play/${encodeURIComponent(scenario.id)}`)
            }
          }}
        />
      </div>
    </section>
  )
}
