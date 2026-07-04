"use client"

import { useRouter } from "next/navigation"

import { ScenarioPicker } from "@/components/scenario-picker"
import type { Scenario } from "@/lib/scenarios"

export function FreePlaySection() {
  const router = useRouter()

  function handleSelect(scenario: Scenario) {
    router.push(`/play/${encodeURIComponent(scenario.id)}`)
  }

  return (
    <section id="free-play" className="scroll-mt-16 border-t bg-muted/20">
      <ScenarioPicker onSelect={handleSelect} />
    </section>
  )
}
