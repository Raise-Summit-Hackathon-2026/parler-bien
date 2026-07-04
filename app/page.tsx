"use client"

import { useState } from "react"

import { AuthGate } from "@/components/auth-gate"
import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_REGION_ID,
} from "@/components/language-picker"
import { PracticeSession } from "@/components/practice-session"
import { ScenarioPicker } from "@/components/scenario-picker"
import type { LanguageId, RegionId } from "@/lib/languages"
import { getDefaultRegionId } from "@/lib/languages"
import type { Scenario } from "@/lib/scenarios"

export default function Page() {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [languageId, setLanguageId] = useState<LanguageId>(DEFAULT_LANGUAGE_ID)
  const [regionId, setRegionId] = useState<RegionId>(DEFAULT_REGION_ID)

  function handleLanguageChange(nextLanguageId: LanguageId) {
    setLanguageId(nextLanguageId)
    setRegionId(getDefaultRegionId(nextLanguageId))
  }

  if (!scenario) {
    return (
      <AuthGate>
        <ScenarioPicker
          languageId={languageId}
          regionId={regionId}
          onLanguageChange={handleLanguageChange}
          onRegionChange={setRegionId}
          onSelect={setScenario}
        />
      </AuthGate>
    )
  }

  return (
    <AuthGate>
      <PracticeSession
        key={`${scenario.id}-${languageId}-${regionId}`}
        scenario={scenario}
        languageId={languageId}
        regionId={regionId}
        onLanguageChange={handleLanguageChange}
        onRegionChange={setRegionId}
        onBack={() => setScenario(null)}
      />
    </AuthGate>
  )
}
