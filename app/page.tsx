"use client"

import { useCallback, useState } from "react"

import { AgentPreviewSheet } from "@/components/agent-preview-sheet"
import { AuthGate } from "@/components/auth-gate"
import { CompanyHubPage } from "@/components/company-hub"
import { FreePlaySection } from "@/components/free-play-section"
import { GestureSession } from "@/components/gesture-session"
import { LevelPath } from "@/components/level-path"
import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_REGION_ID,
} from "@/components/language-picker"
import { PracticeSession } from "@/components/practice-session"
import { TrackCatalogue } from "@/components/track-catalogue"
import { getAgent } from "@/lib/agents"
import type { CompanyHub } from "@/lib/companies"
import { getCompanyHub } from "@/lib/companies"
import type { LanguageId, RegionId } from "@/lib/languages"
import { getDefaultRegionId } from "@/lib/languages"
import { buildLevelScenario, type LevelContext } from "@/lib/level-scenario"
import type { Scenario } from "@/lib/scenarios"
import { getLevelStatus } from "@/lib/track-progress"
import {
  isGestureLevel,
  type LearningTrack,
  type TrackLevel,
} from "@/lib/tracks"

type AppView =
  | { kind: "catalogue" }
  | { kind: "company"; hub: CompanyHub }
  | { kind: "preview"; track: LearningTrack }
  | { kind: "path"; track: LearningTrack }
  | { kind: "session"; track: LearningTrack; level: TrackLevel; scenario: Scenario }
  | { kind: "gesture"; track: LearningTrack; level: TrackLevel }
  | { kind: "freeplay" }
  | { kind: "freeplay-session"; scenario: Scenario }

function scenarioLanguageForTrack(
  track: LearningTrack,
  languageId: LanguageId,
): LanguageId {
  if (
    track.id === "french-pronunciation" ||
    track.companyId === "galeries-lafayette"
  ) {
    return "fr"
  }
  if (track.id === "cabin-crew" || track.id === "path-with-buddha") {
    return "en"
  }
  return languageId
}

function pathBackView(track: LearningTrack): AppView {
  if (track.companyId) {
    return { kind: "company", hub: getCompanyHub(track.companyId) }
  }
  return { kind: "catalogue" }
}

function requiresAuth(view: AppView) {
  return !["catalogue", "company", "freeplay"].includes(view.kind)
}

export default function Page() {
  const [view, setView] = useState<AppView>({ kind: "catalogue" })
  const [languageId, setLanguageId] = useState<LanguageId>(DEFAULT_LANGUAGE_ID)
  const [regionId, setRegionId] = useState<RegionId>(DEFAULT_REGION_ID)
  const [pathKey, setPathKey] = useState(0)

  function handleLanguageChange(nextLanguageId: LanguageId) {
    setLanguageId(nextLanguageId)
    setRegionId(getDefaultRegionId(nextLanguageId))
  }

  const handleLevelComplete = useCallback((track: LearningTrack) => {
    setPathKey((k) => k + 1)
    setView({ kind: "path", track })
  }, [])

  function renderView() {
    if (view.kind === "freeplay-session") {
      return (
        <PracticeSession
          key={`${view.scenario.id}-${languageId}-${regionId}`}
          scenario={view.scenario}
          languageId={languageId}
          regionId={regionId}
          onLanguageChange={handleLanguageChange}
          onRegionChange={setRegionId}
          onBack={() => setView({ kind: "freeplay" })}
        />
      )
    }

    if (view.kind === "gesture") {
      const agent = getAgent(view.level.agentId)
      const criteria = view.level.passCriteria
      if (criteria.type !== "gesture") return null

      const levelContext: LevelContext = {
        trackId: view.track.id,
        levelId: view.level.id,
        level: view.level,
        agent,
        passCriteria: criteria,
        onLevelComplete: () => handleLevelComplete(view.track),
      }

      return (
        <GestureSession
          key={view.level.id}
          agent={agent}
          steps={criteria.steps}
          holdMs={criteria.holdMs}
          winMessage={view.level.room.winMessage ?? "Level complete!"}
          levelContext={levelContext}
          onBack={() => setView({ kind: "path", track: view.track })}
        />
      )
    }

    if (view.kind === "session") {
      const agent = getAgent(view.level.agentId)
      const levelContext: LevelContext = {
        trackId: view.track.id,
        levelId: view.level.id,
        level: view.level,
        agent,
        passCriteria: view.level.passCriteria,
        onLevelComplete: () => handleLevelComplete(view.track),
      }

      const scenarioLang = scenarioLanguageForTrack(view.track, languageId)

      return (
        <PracticeSession
          key={`${view.level.id}-${scenarioLang}-${regionId}`}
          scenario={view.scenario}
          languageId={scenarioLang}
          regionId={regionId}
          onLanguageChange={handleLanguageChange}
          onRegionChange={setRegionId}
          onBack={() => setView({ kind: "path", track: view.track })}
          levelContext={levelContext}
        />
      )
    }

    if (view.kind === "path") {
      return (
        <LevelPath
          key={`${view.track.id}-${pathKey}`}
          track={view.track}
          onBack={() => setView(pathBackView(view.track))}
          onSelectLevel={(level) => {
            const status = getLevelStatus(view.track.id, level.id)
            if (status === "wip" || status === "locked") return

            if (isGestureLevel(level)) {
              setView({ kind: "gesture", track: view.track, level })
              return
            }

            const agent = getAgent(level.agentId)
            const scenarioLang = scenarioLanguageForTrack(view.track, languageId)
            const scenario = buildLevelScenario(level, agent, scenarioLang)
            setView({
              kind: "session",
              track: view.track,
              level,
              scenario,
            })
          }}
        />
      )
    }

    if (view.kind === "company") {
      return (
        <CompanyHubPage
          hub={view.hub}
          onBack={() => setView({ kind: "catalogue" })}
          onSelectTrack={(track) => setView({ kind: "preview", track })}
        />
      )
    }

    if (view.kind === "preview") {
      return (
        <>
          <TrackCatalogue
            languageId={languageId}
            regionId={regionId}
            onLanguageChange={handleLanguageChange}
            onRegionChange={setRegionId}
            onSelectTrack={(track) => setView({ kind: "preview", track })}
            onSelectCompany={(hub) => setView({ kind: "company", hub })}
            onFreePlay={() => setView({ kind: "freeplay" })}
          />
          <AgentPreviewSheet
            track={view.track}
            languageId={scenarioLanguageForTrack(view.track, languageId)}
            regionId={regionId}
            onStart={() => setView({ kind: "path", track: view.track })}
            onClose={() =>
              setView(
                view.track.companyId
                  ? { kind: "company", hub: getCompanyHub(view.track.companyId) }
                  : { kind: "catalogue" },
              )
            }
          />
        </>
      )
    }

    if (view.kind === "freeplay") {
      return (
        <FreePlaySection
          languageId={languageId}
          regionId={regionId}
          onLanguageChange={handleLanguageChange}
          onRegionChange={setRegionId}
          onSelect={(scenario) => setView({ kind: "freeplay-session", scenario })}
          onBack={() => setView({ kind: "catalogue" })}
        />
      )
    }

    return (
      <TrackCatalogue
        key={pathKey}
        languageId={languageId}
        regionId={regionId}
        onLanguageChange={handleLanguageChange}
        onRegionChange={setRegionId}
        onSelectTrack={(track) => setView({ kind: "preview", track })}
        onSelectCompany={(hub) => setView({ kind: "company", hub })}
        onFreePlay={() => setView({ kind: "freeplay" })}
      />
    )
  }

  const content = renderView()

  if (requiresAuth(view)) {
    return <AuthGate>{content}</AuthGate>
  }

  return content
}
