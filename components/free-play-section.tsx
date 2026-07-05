"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { CharacterGrid } from "@/components/character-grid"
import { CATEGORIES } from "@/lib/character"
import { rowToCharacter } from "@/lib/character-compat"
import { deleteCharacter, listPersonalCharacters } from "@/lib/character-db"
import { builtInCharactersByCategory } from "@/lib/characters/index"
import { getCompletedScenarios } from "@/lib/completions"
import type { CharacterRow } from "@/lib/workspace-types"

export function FreePlaySection() {
  const router = useRouter()
  const [rows, setRows] = useState<CharacterRow[]>([])
  const [completed] = useState<string[]>(() => getCompletedScenarios())

  useEffect(() => {
    listPersonalCharacters().then(setRows).catch(() => setRows([]))
  }, [])

  const yours = rows.map(rowToCharacter)

  const play = (id: string) => router.push(`/play/${encodeURIComponent(id)}`)

  return (
    <section
      id="free-play"
      className="border-t bg-background text-foreground dark:bg-[#05070a] dark:text-white"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">All scenarios</h2>
          <p className="max-w-2xl text-muted-foreground dark:text-white/55">
            Pick an AI character, step into their scene, and role-play the
            conversation out loud. Language and accent live in settings (top
            right).
          </p>
        </div>

        {CATEGORIES.map((category) => (
          <div key={category.id} className="mb-10">
            <h3 className="text-lg font-semibold tracking-tight">{category.label}</h3>
            <p className="mb-4 text-sm text-muted-foreground dark:text-white/50">
              {category.tagline}
            </p>
            <CharacterGrid
              characters={builtInCharactersByCategory(category.id)}
              completedIds={completed}
              showCreateCard={false}
              onSelect={({ character }) => play(character.id)}
            />
          </div>
        ))}

        <div className="mb-10">
          <h3 className="text-lg font-semibold tracking-tight">Yours</h3>
          <p className="mb-4 text-sm text-muted-foreground dark:text-white/50">
            Role-playing characters you created from a prompt, PDF, or course
            upload.
          </p>
          <CharacterGrid
            characters={yours}
            completedIds={completed}
            showCreateCard
            deletableIds={yours.map((c) => c.id)}
            onSelect={({ character }) => play(character.id)}
            onCharacterCreated={(created) => setRows((current) => [...created, ...current])}
            onCharacterDeleted={(id) => {
              void deleteCharacter(id)
              setRows((current) => current.filter((r) => r.id !== id))
            }}
          />
        </div>
      </div>
    </section>
  )
}
