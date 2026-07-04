"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { PracticeSession } from "@/components/practice-session"
import type { Character } from "@/lib/character"
import { rowToCharacter } from "@/lib/character-compat"
import { getCharacter } from "@/lib/character-db"

export default function PersonalCharacterPlayPage() {
  const params = useParams<{ characterId: string }>()
  const router = useRouter()
  const [character, setCharacter] = useState<Character | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getCharacter(params.characterId)
      .then((row) => {
        if (!row || row.workspace_id) {
          throw new Error("Character not found")
        }
        setCharacter(rowToCharacter(row))
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load character"),
      )
  }, [params.characterId])

  if (error) {
    return <p className="px-6 py-12 text-sm text-destructive">{error}</p>
  }

  if (!character) {
    return <p className="px-6 py-12 text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <AuthGate>
      <PracticeSession
        key={params.characterId}
        character={character}
        levelIndex={0}
        onBack={() => router.push("/#free-play")}
      />
    </AuthGate>
  )
}
