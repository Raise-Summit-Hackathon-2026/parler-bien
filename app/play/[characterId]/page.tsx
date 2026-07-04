"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { CharacterSession } from "@/components/character-session"
import type { Character } from "@/lib/character"
import { rowToCharacter } from "@/lib/character-compat"
import { getCharacter } from "@/lib/character-db"
import { getBuiltInCharacter, isBuiltInCharacterId } from "@/lib/characters/index"

function PlayCharacterInner() {
  const params = useParams<{ characterId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [character, setCharacter] = useState<Character | null>(null)
  const [error, setError] = useState("")

  const from = searchParams.get("from")
  const workspaceId = from?.startsWith("workspace:") ? from.slice("workspace:".length) : null
  const backTarget = workspaceId ? `/workspaces/${workspaceId}` : "/#free-play"
  const backLabel = workspaceId ? "Workspace" : "Free play"

  useEffect(() => {
    const id = decodeURIComponent(params.characterId)
    if (isBuiltInCharacterId(id)) {
      setCharacter(getBuiltInCharacter(id))
      return
    }
    getCharacter(id)
      .then((row) => {
        if (!row) throw new Error("Character not found")
        setCharacter(rowToCharacter(row))
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load character"),
      )
  }, [params.characterId])

  if (error) return <p className="px-6 py-12 text-sm text-destructive">{error}</p>
  if (!character) return <p className="px-6 py-12 text-sm text-muted-foreground">Loading…</p>

  return (
    <AuthGate>
      <CharacterSession
        key={character.id}
        character={character}
        onBack={() => router.push(backTarget)}
        backLabel={backLabel}
      />
    </AuthGate>
  )
}

export default function PlayCharacterPage() {
  return (
    <Suspense
      fallback={<p className="px-6 py-12 text-sm text-muted-foreground">Loading…</p>}
    >
      <PlayCharacterInner />
    </Suspense>
  )
}
