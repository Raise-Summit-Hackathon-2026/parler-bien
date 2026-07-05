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

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-all",
        "hover:border-foreground/20 hover:shadow-md",
      )}
    >
      <div className="relative shrink-0">
        <ScenarioScene
          scenarioId={isBuiltIn ? character.id : undefined}
          imagePrompt={!isBuiltIn ? character.avatarPrompt : undefined}
          className="aspect-[5/3] w-full"
        />
        {badge && (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
            {badge}
          </span>
        )}
        {completed && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
            <Check className="size-3" />
            Done
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
            className="absolute bottom-1.5 left-1.5 inline-flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            aria-label="Delete character"
          >
            <Trash2 className="size-3" />
          </span>
        )}
      </div>
      <div className="flex min-h-[3.75rem] flex-col justify-center gap-0.5 p-2.5 sm:p-3">
        <p className="line-clamp-1 text-sm font-semibold leading-tight">{character.name}</p>
        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
          {character.tagline}
        </p>
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
      <div className="grid w-full auto-rows-fr grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
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
              "flex h-full min-h-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/20 p-3 text-center transition-all",
              "hover:border-foreground/30 hover:bg-muted/40",
            )}
          >
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Create your own</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
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
