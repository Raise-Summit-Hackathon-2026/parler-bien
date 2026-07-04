"use client"

import { useEffect, useState } from "react"

import {
  CharacterGrid,
  type CharacterSelection,
} from "@/components/character-grid"
import { deleteCharacter, listPersonalCharacters } from "@/lib/character-db"
import { getCompletedScenarios } from "@/lib/completions"
import type { CharacterRow } from "@/lib/workspace-types"
import type { ScenarioId } from "@/lib/scenarios"

type ScenarioPickerProps = {
  onSelect: (selection: CharacterSelection) => void
}

export function ScenarioPicker({ onSelect }: ScenarioPickerProps) {
  const [completed] = useState<ScenarioId[]>(
    () => getCompletedScenarios() as ScenarioId[],
  )
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPersonalCharacters()
      .then(setCharacters)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(characterId: string) {
    await deleteCharacter(characterId)
    setCharacters((current) => current.filter((c) => c.id !== characterId))
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading your characters…</p>
    )
  }

  return (
    <CharacterGrid
      characters={characters}
      completedIds={completed}
      onSelect={onSelect}
      onCharacterCreated={(characters) =>
        setCharacters((current) => [...characters, ...current])
      }
      onCharacterDeleted={(characterId) => void handleDelete(characterId)}
    />
  )
}

export { ScenarioBackButton } from "@/components/scenario-back-button"
