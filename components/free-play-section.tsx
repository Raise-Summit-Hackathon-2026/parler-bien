"use client"

import { ArrowLeft } from "lucide-react"

import { ScenarioPicker } from "@/components/scenario-picker"
import { Button } from "@/components/ui/button"
import type { LanguageId, RegionId } from "@/lib/languages"
import type { Scenario } from "@/lib/scenarios"

type FreePlaySectionProps = {
  languageId: LanguageId
  regionId: RegionId
  onLanguageChange: (languageId: LanguageId) => void
  onRegionChange: (regionId: RegionId) => void
  onSelect: (scenario: Scenario) => void
  onBack: () => void
}

export function FreePlaySection({
  languageId,
  regionId,
  onLanguageChange,
  onRegionChange,
  onSelect,
  onBack,
}: FreePlaySectionProps) {
  return (
    <div className="relative">
      <div className="absolute top-6 left-6 z-10">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft />
          Tracks
        </Button>
      </div>
      <ScenarioPicker
        languageId={languageId}
        regionId={regionId}
        onLanguageChange={onLanguageChange}
        onRegionChange={onRegionChange}
        onSelect={onSelect}
      />
    </div>
  )
}
