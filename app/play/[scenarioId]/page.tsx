"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { PracticeSession } from "@/components/practice-session"
import { scenarioToCharacter } from "@/lib/character"
import {
  getScenario,
  isBuiltInScenarioId,
  isScenarioId,
} from "@/lib/scenarios"

export default function PlaySessionPage() {
  const params = useParams<{ scenarioId: string }>()
  const router = useRouter()

  const scenario = useMemo(() => {
    const decodedId = decodeURIComponent(params.scenarioId)
    if (!isScenarioId(decodedId)) {
      throw new Error(`Unknown scenario: ${decodedId}`)
    }

    if (isBuiltInScenarioId(decodedId)) {
      return getScenario(decodedId)
    }

    throw new Error(`Unknown scenario: ${decodedId}`)
  }, [params.scenarioId])

  return (
    <AuthGate>
      <PracticeSession
        key={scenario.id}
        character={scenarioToCharacter(scenario, scenario.id)}
        levelIndex={0}
        onBack={() => router.push("/#free-play")}
      />
    </AuthGate>
  )
}
