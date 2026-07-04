"use client"

import { Check, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { CharacterBuilder } from "@/components/character-builder"
import { ScenarioScene } from "@/components/scenario-scene"
import { useLanguage } from "@/components/language-provider"
import type { Character } from "@/lib/character"
import { levelBadge } from "@/lib/character"
import { isBuiltInCharacterId } from "@/lib/characters/index"
import type { CharacterRow } from "@/lib/workspace-types"
import { cn } from "@/lib/utils"

export type CharacterSelection = {
  character: Character
  rowId?: string
}

type CharacterGridProps = {
  characters: Character[]
  completedIds?: string[]
  showCreateCard?: boolean
  workspaceId?: string
  workspaceContext?: { name: string; description?: string | null }
  onSelect: (selection: CharacterSelection) => void
  onCharacterCreated?: (rows: CharacterRow[]) => void
  onCharacterDeleted?: (characterId: string) => void
  deletableIds?: string[]
}

function firstVoiceGoal(character: Character): string | null {
  for (const level of character.levels) {
    if (level.kind === "voice" && level.goal) return level.goal
  }
  return null
}

function CharacterCard({
  character,
  completed,
  deletable,
  onSelect,
  onDelete,
}: {
  character: Character
  completed: boolean
  deletable?: boolean
  onSelect: () => void
  onDelete?: () => void
}) {
  const isBuiltIn = isBuiltInCharacterId(character.id)
  const badge = levelBadge(character)
  const goal = firstVoiceGoal(character)
  const featured = character.featured

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-all",
        "hover:border-foreground/20 hover:shadow-md",
        featured && "sm:col-span-2",
      )}
    >
      <div className="relative">
        <ScenarioScene
          scenarioId={isBuiltIn ? character.id : undefined}
          imagePrompt={!isBuiltIn ? character.avatarPrompt : undefined}
          className={cn("w-full", featured ? "h-44" : "h-32")}
        />
        {badge && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            {badge}
          </span>
        )}
        {completed && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            <Check className="size-3" />
            Completed
          </span>
        )}
        {deletable && onDelete && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                event.stopPropagation()
                onDelete()
              }
            }}
            className="absolute bottom-2 left-2 inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            aria-label="Delete character"
          >
            <Trash2 className="size-3.5" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-semibold">{character.name}</p>
        <p className="text-sm text-muted-foreground">{character.tagline}</p>
        {character.sourceLabel && (
          <p className="text-xs text-muted-foreground">From {character.sourceLabel}</p>
        )}
        {goal && (
          <p className="mt-auto pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Goal: {goal}
          </p>
        )}
      </div>
    </button>
  )
}

export function CharacterGrid({
  characters,
  completedIds = [],
  showCreateCard = true,
  workspaceId,
  workspaceContext,
  onSelect,
  onCharacterCreated,
  onCharacterDeleted,
  deletableIds = [],
}: CharacterGridProps) {
  const { languageId, regionId } = useLanguage()
  const [showBuilder, setShowBuilder] = useState(false)

  return (
    <>
      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            completed={completedIds.includes(character.id)}
            deletable={deletableIds.includes(character.id)}
            onSelect={() => onSelect({ character, rowId: character.id })}
            onDelete={() => onCharacterDeleted?.(character.id)}
          />
        ))}

        {showCreateCard && (
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className={cn(
              "flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-muted/20 p-6 text-center transition-all",
              "hover:border-foreground/30 hover:bg-muted/40",
            )}
          >
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-6" />
            </span>
            <div>
              <p className="font-semibold">Create your own</p>
              <p className="mt-1 text-sm text-muted-foreground">
                From a prompt, PDF, or course upload
              </p>
            </div>
          </button>
        )}
      </div>

      {showBuilder && (
        <CharacterBuilder
          languageId={languageId}
          regionId={regionId}
          workspaceId={workspaceId}
          workspaceContext={workspaceContext}
          onCreated={(rows) => {
            setShowBuilder(false)
            onCharacterCreated?.(rows)
          }}
          onCancel={() => setShowBuilder(false)}
        />
      )}
    </>
  )
}
