"use client"

import { ArrowLeft, Check } from "lucide-react"
import { useState } from "react"

import { ScenarioScene } from "@/components/scenario-scene"
import { Button } from "@/components/ui/button"
import { LanguagePicker } from "@/components/language-picker"
import { getCompletedScenarios } from "@/lib/completions"
import { getLanguage, getRegion, type LanguageId, type RegionId } from "@/lib/languages"
import { SCENARIOS, type Scenario, type ScenarioId } from "@/lib/scenarios"
import { cn } from "@/lib/utils"

type ScenarioPickerProps = {
  languageId: LanguageId
  regionId: RegionId
  onLanguageChange: (languageId: LanguageId) => void
  onRegionChange: (regionId: RegionId) => void
  onSelect: (scenario: Scenario) => void
}

export function ScenarioPicker({
  languageId,
  regionId,
  onLanguageChange,
  onRegionChange,
  onSelect,
}: ScenarioPickerProps) {
  const [completed] = useState<ScenarioId[]>(() => getCompletedScenarios())
  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="space-y-4 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Parler Bien
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose your scenario
        </h1>
        <p className="text-muted-foreground">
          Speak {language.name}. Get scored. Win the conversation.
        </p>
        <LanguagePicker
          languageId={languageId}
          regionId={regionId}
          onLanguageChange={onLanguageChange}
          onRegionChange={onRegionChange}
        />
        <p className="text-xs text-muted-foreground">
          {region.accent} · {region.city}
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onSelect(scenario)}
            className={cn(
              "flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-all",
              "hover:border-foreground/20 hover:shadow-md",
            )}
          >
            <div className="relative">
              <ScenarioScene scenarioId={scenario.id} className="h-32 w-full" />
              {completed.includes(scenario.id) && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
                  <Check className="size-3" />
                  Completed
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-4">
              <p className="font-semibold">{scenario.title}</p>
              <p className="text-sm text-muted-foreground">{scenario.tagline}</p>
              {scenario.goal && (
                <p className="mt-auto pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Goal: {scenario.goal}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ScenarioBackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
      <ArrowLeft />
      Scenarios
    </Button>
  )
}
