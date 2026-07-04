"use client"

import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { CustomScenarioBuilder } from "@/components/custom-scenario-builder"
import { ScenarioScene } from "@/components/scenario-scene"
import { Button } from "@/components/ui/button"
import { LanguagePicker } from "@/components/language-picker"
import {
  deleteCustomScenario,
  getCustomScenarios,
} from "@/lib/custom-scenarios"
import { getCompletedScenarios } from "@/lib/completions"
import { getLanguage, getRegion, type LanguageId, type RegionId } from "@/lib/languages"
import {
  isBuiltInScenarioId,
  isCustomScenarioId,
  SCENARIOS,
  type Scenario,
  type ScenarioId,
} from "@/lib/scenarios"
import { cn } from "@/lib/utils"

type ScenarioPickerProps = {
  languageId: LanguageId
  regionId: RegionId
  onLanguageChange: (languageId: LanguageId) => void
  onRegionChange: (regionId: RegionId) => void
  onSelect: (scenario: Scenario) => void
}

function ScenarioCard({
  scenario,
  completed,
  onSelect,
  onDelete,
}: {
  scenario: Scenario
  completed: boolean
  onSelect: () => void
  onDelete?: () => void
}) {
  const isCustom = isCustomScenarioId(scenario.id)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-all",
        "hover:border-foreground/20 hover:shadow-md",
      )}
    >
      <div className="relative">
        <ScenarioScene
          scenarioId={isBuiltInScenarioId(scenario.id) ? scenario.id : undefined}
          imagePrompt={isCustom ? scenario.imagePrompt : undefined}
          className="h-32 w-full"
        />
        {completed && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            <Check className="size-3" />
            Completed
          </span>
        )}
        {isCustom && onDelete && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                event.stopPropagation()
                onDelete()
              }
            }}
            className="absolute top-2 left-2 inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            aria-label="Delete custom scenario"
          >
            <Trash2 className="size-3.5" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-semibold">{scenario.title}</p>
        <p className="text-sm text-muted-foreground">{scenario.tagline}</p>
        {isCustom && scenario.sourceLabel && (
          <p className="text-xs text-muted-foreground">From {scenario.sourceLabel}</p>
        )}
        {scenario.goal && (
          <p className="mt-auto pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Goal: {scenario.goal}
          </p>
        )}
      </div>
    </button>
  )
}

export function ScenarioPicker({
  languageId,
  regionId,
  onLanguageChange,
  onRegionChange,
  onSelect,
}: ScenarioPickerProps) {
  const [completed] = useState<ScenarioId[]>(() => getCompletedScenarios())
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>(() =>
    getCustomScenarios(),
  )
  const [showBuilder, setShowBuilder] = useState(false)

  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  function handleCreated(scenario: Scenario) {
    setCustomScenarios(getCustomScenarios())
    setShowBuilder(false)
    onSelect(scenario)
  }

  function handleDelete(id: ScenarioId) {
    deleteCustomScenario(id)
    setCustomScenarios(getCustomScenarios())
  }

  return (
    <>
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
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              completed={completed.includes(scenario.id)}
              onSelect={() => onSelect(scenario)}
            />
          ))}

          {customScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              completed={completed.includes(scenario.id)}
              onSelect={() => onSelect(scenario)}
              onDelete={() => handleDelete(scenario.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className={cn(
              "flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-muted/20 p-6 text-center transition-all",
              "hover:border-foreground/30 hover:bg-muted/40",
            )}
          >
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-6" />
            </span>
            <div>
              <p className="font-semibold">Create your own</p>
              <p className="mt-1 text-sm text-muted-foreground">
                From a prompt, PDF, or course upload
              </p>
            </div>
          </button>
        </div>
      </div>

      {showBuilder && (
        <CustomScenarioBuilder
          languageId={languageId}
          regionId={regionId}
          onCreated={handleCreated}
          onCancel={() => setShowBuilder(false)}
        />
      )}
    </>
  )
}

export function ScenarioBackButton({
  onBack,
  label = "Scenarios",
}: {
  onBack: () => void
  label?: string
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
      <ArrowLeft />
      {label}
    </Button>
  )
}
