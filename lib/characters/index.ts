import type { Character, CharacterCategoryId } from "@/lib/character"
import { EVERYDAY_CHARACTERS } from "./everyday"
import { LANGUAGES_CHARACTERS } from "./languages"
import { PROFESSIONAL_CHARACTERS } from "./professional"
import { SPORTS_CHARACTERS } from "./sports"

export const BUILT_IN_CHARACTERS: Character[] = [
  ...LANGUAGES_CHARACTERS,
  ...PROFESSIONAL_CHARACTERS,
  ...SPORTS_CHARACTERS,
  ...EVERYDAY_CHARACTERS,
]

const BUILT_IN_CHARACTER_ALIASES: Record<string, string> = {
  "captain-eva": "cabin-crew",
}

export function isBuiltInCharacterId(value: string): boolean {
  return (
    BUILT_IN_CHARACTERS.some((c) => c.id === value) ||
    value in BUILT_IN_CHARACTER_ALIASES
  )
}

export function getBuiltInCharacter(id: string): Character {
  const resolvedId = BUILT_IN_CHARACTER_ALIASES[id] ?? id
  const character = BUILT_IN_CHARACTERS.find((c) => c.id === resolvedId)
  if (!character) throw new Error(`Unknown character: ${id}`)
  return character
}

export function builtInCharactersByCategory(
  category: CharacterCategoryId,
): Character[] {
  return BUILT_IN_CHARACTERS.filter((c) => c.category === category)
}
