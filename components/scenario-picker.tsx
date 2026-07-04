"use client"

import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { CustomScenarioBuilder } from "@/components/custom-scenario-builder"
import { ScenarioScene } from "@/components/scenario-scene"
import {
  ComingSoonCard,
  DemoPathLink,
  ScenarioGrid,
  UseCaseSection,
} from "@/components/use-case-section"
import { Button } from "@/components/ui/button"
import { LanguagePicker } from "@/components/language-picker"
import {
  deleteCustomScenario,
  getCustomScenarios,
} from "@/lib/custom-scenarios"
import { getCompletedScenarios } from "@/lib/completions"
import { getRegion, type LanguageId, type RegionId } from "@/lib/languages"
import { isLinguaTrainerId } from "@/lib/lingua-trainers"
import {
  isBuiltInScenarioId,
  isCustomScenarioId,
  type Scenario,
  type ScenarioId,
} from "@/lib/scenarios"
import {
  USE_CASES,
  getLanguagePracticeScenarios,
  getLinguaPracticeScenarios,
  getRichLaughPracticeScenarios,
  getSalesPracticeScenarios,
} from "@/lib/use-cases"
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

function renderScenarioCards(
  scenarios: Scenario[],
  completed: ScenarioId[],
  onSelect: (scenario: Scenario) => void,
  onDelete?: (id: ScenarioId) => void,
) {
  return scenarios.map((scenario) => (
    <ScenarioCard
      key={scenario.id}
      scenario={scenario}
      completed={completed.includes(scenario.id)}
      onSelect={() => onSelect(scenario)}
      onDelete={
        isCustomScenarioId(scenario.id) && onDelete
          ? () => onDelete(scenario.id)
          : undefined
      }
    />
  ))
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

  const region = getRegion(languageId, regionId)

  const languageUseCase = USE_CASES.find((u) => u.id === "language")!
  const salesUseCase = USE_CASES.find((u) => u.id === "sales")!
  const linguaUseCase = USE_CASES.find((u) => u.id === "lingua")!
  const laughUseCase = USE_CASES.find((u) => u.id === "rich_laugh")!
  const teamUseCase = USE_CASES.find((u) => u.id === "team")!
  const agentsUseCase = USE_CASES.find((u) => u.id === "agents")!
  const cloneUseCase = USE_CASES.find((u) => u.id === "voice_clone")!

  function handleCreated(scenario: Scenario) {
    setCustomScenarios(getCustomScenarios())
    setShowBuilder(false)
    onSelect(scenario)
  }

  function handleDelete(id: ScenarioId) {
    deleteCustomScenario(id)
    setCustomScenarios(getCustomScenarios())
  }

  function handleSelect(scenario: Scenario) {
    if (isLinguaTrainerId(scenario.id)) {
      onLanguageChange("en")
      onRegionChange("en-US")
    }
    onSelect(scenario)
  }

  return (
    <>
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <div className="space-y-4 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Parler Bien
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Choose a use case</h1>
          <p className="text-muted-foreground">
            Voice training for language, sales, status, and social delivery.
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

        <nav className="flex flex-wrap justify-center gap-2">
          {USE_CASES.map((useCase) => (
            <a
              key={useCase.id}
              href={`#${useCase.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted",
                useCase.status === "coming_soon" && "text-muted-foreground",
              )}
            >
              {useCase.title}
            </a>
          ))}
        </nav>

        <div className="w-full space-y-10">
          <UseCaseSection useCase={languageUseCase}>
            <ScenarioGrid>
              {renderScenarioCards(
                getLanguagePracticeScenarios(),
                completed,
                handleSelect,
              )}
              {renderScenarioCards(customScenarios, completed, handleSelect, handleDelete)}
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
            </ScenarioGrid>
          </UseCaseSection>

          <UseCaseSection useCase={salesUseCase} action={<DemoPathLink />}>
            <ScenarioGrid>
              {renderScenarioCards(
                getSalesPracticeScenarios(),
                completed,
                handleSelect,
              )}
            </ScenarioGrid>
          </UseCaseSection>

          <UseCaseSection useCase={linguaUseCase}>
            <ScenarioGrid>
              {renderScenarioCards(
                getLinguaPracticeScenarios(),
                completed,
                handleSelect,
              )}
            </ScenarioGrid>
          </UseCaseSection>

          <UseCaseSection useCase={laughUseCase}>
            <ScenarioGrid>
              {renderScenarioCards(
                getRichLaughPracticeScenarios(),
                completed,
                handleSelect,
              )}
            </ScenarioGrid>
          </UseCaseSection>

          <UseCaseSection useCase={teamUseCase}>
            <ComingSoonCard useCase={teamUseCase} />
          </UseCaseSection>

          <UseCaseSection useCase={agentsUseCase}>
            <Link
              href="/agent"
              className="flex min-h-[140px] flex-col justify-center rounded-3xl border bg-card p-6 shadow-sm transition-colors hover:border-foreground/20 hover:shadow-md"
            >
              <p className="font-semibold">Open personal agent</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect Gmail, ask about your inbox or schedule — Composio-powered tools.
              </p>
              <p className="mt-3 text-xs font-medium text-primary">Launch →</p>
            </Link>
          </UseCaseSection>

          <UseCaseSection useCase={cloneUseCase}>
            <ComingSoonCard useCase={cloneUseCase} />
          </UseCaseSection>
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

export function ScenarioBackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
      <ArrowLeft />
      Use cases
    </Button>
  )
}
