"use client"

import { useCallback } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { GestureSession } from "@/components/gesture-session"
import { PracticeSession } from "@/components/practice-session"
import { useLanguage } from "@/components/language-provider"
import { getAgent } from "@/lib/agents"
import { buildLevelScenario, type LevelContext } from "@/lib/level-scenario"
import { scenarioLanguageForTrack } from "@/lib/track-navigation"
import { getTrack, getTrackLevel, isGestureLevel } from "@/lib/tracks"

export default function TrackLevelPage() {
  const params = useParams<{ trackId: string; levelId: string }>()
  const router = useRouter()
  const { languageId } = useLanguage()
  const track = getTrack(params.trackId)
  const level = getTrackLevel(params.trackId, params.levelId)

  const handleLevelComplete = useCallback(() => {
    router.push(`/tracks/${track.id}/path`)
  }, [router, track.id])

  if (isGestureLevel(level)) {
    const agent = getAgent(level.agentId)
    const criteria = level.passCriteria
    if (criteria.type !== "gesture") return null

    const levelContext: LevelContext = {
      trackId: track.id,
      levelId: level.id,
      level,
      agent,
      passCriteria: criteria,
      onLevelComplete: handleLevelComplete,
    }

    return (
      <AuthGate>
        <GestureSession
          key={level.id}
          agent={agent}
          steps={criteria.steps}
          holdMs={criteria.holdMs}
          winMessage={level.room.winMessage ?? "Level complete!"}
          levelContext={levelContext}
          onBack={() => router.push(`/tracks/${track.id}/path`)}
        />
      </AuthGate>
    )
  }

  const agent = getAgent(level.agentId)
  const scenarioLang = scenarioLanguageForTrack(track, languageId)
  const scenario = buildLevelScenario(level, agent, scenarioLang)

  const levelContext: LevelContext = {
    trackId: track.id,
    levelId: level.id,
    level,
    agent,
    passCriteria: level.passCriteria,
    onLevelComplete: handleLevelComplete,
  }

  return (
    <AuthGate>
      <PracticeSession
        key={`${level.id}-${scenarioLang}`}
        scenario={scenario}
        onBack={() => router.push(`/tracks/${track.id}/path`)}
        levelContext={levelContext}
      />
    </AuthGate>
  )
}
