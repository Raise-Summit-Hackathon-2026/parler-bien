"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { PracticeSession } from "@/components/practice-session"
import { getCharacter } from "@/lib/characters"
import type { Scenario } from "@/lib/scenarios"

export default function PersonalCharacterPlayPage() {
  const params = useParams<{ characterId: string }>()
  const router = useRouter()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getCharacter(params.characterId)
      .then((character) => {
        if (!character || character.workspace_id) {
          throw new Error("Character not found")
        }
        setScenario(character.scenario)
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load character"),
      )
  }, [params.characterId])

  if (error) {
    return <p className="px-6 py-12 text-sm text-destructive">{error}</p>
  }

  if (!scenario) {
    return <p className="px-6 py-12 text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <AuthGate>
      <PracticeSession
        key={params.characterId}
        scenario={scenario}
        onBack={() => router.push("/#free-play")}
      />
    </AuthGate>
  )
}
