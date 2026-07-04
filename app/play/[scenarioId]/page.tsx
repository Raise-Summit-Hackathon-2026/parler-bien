"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { PracticeSession } from "@/components/practice-session"
import { getCustomScenarios } from "@/lib/custom-scenarios"
import {
  getScenario,
  isBuiltInScenarioId,
  isCustomScenarioId,
  isScenarioId,
  resolveScenario,
} from "@/lib/scenarios"

export default function PlaySessionPage() {
  const params = useParams<{ scenarioId: string }>()
  const router = useRouter()

  const scenario = useMemo(() => {
    const decodedId = decodeURIComponent(params.scenarioId)
    if (!isScenarioId(decodedId)) {
      throw new Error(`Unknown scenario: ${decodedId}`)
    }

    if (isCustomScenarioId(decodedId)) {
      const customScenario = getCustomScenarios().find(
        (item) => item.id === decodedId,
      )
      return resolveScenario(decodedId, customScenario)
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
        scenario={scenario}
        onBack={() => router.push("/#free-play")}
      />
    </AuthGate>
  )
}
