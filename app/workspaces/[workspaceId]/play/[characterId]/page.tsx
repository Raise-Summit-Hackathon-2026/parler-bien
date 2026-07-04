"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { PracticeSession } from "@/components/practice-session"
import { getCharacter } from "@/lib/character-db"
import type { Scenario } from "@/lib/scenarios"

export default function WorkspaceCharacterPlayPage() {
  const params = useParams<{ workspaceId: string; characterId: string }>()
  const router = useRouter()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getCharacter(params.characterId)
      .then((character) => {
        if (!character || character.workspace_id !== params.workspaceId) {
          throw new Error("Character not found")
        }
        // TODO(task 4+): CharacterRow.scenario is Character | Scenario post-unification;
        // this page still expects legacy Scenario shape until migrated to Character.
        setScenario(character.scenario as Scenario)
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load character"),
      )
  }, [params.characterId, params.workspaceId])

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
        backLabel="Workspace"
        onBack={() => router.push(`/workspaces/${params.workspaceId}`)}
      />
    </AuthGate>
  )
}
