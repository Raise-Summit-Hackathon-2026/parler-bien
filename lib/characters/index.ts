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

export function isBuiltInCharacterId(value: string): boolean {
  return BUILT_IN_CHARACTERS.some((c) => c.id === value)
}

export function getBuiltInCharacter(id: string): Character {
  const character = BUILT_IN_CHARACTERS.find((c) => c.id === id)
  if (!character) throw new Error(`Unknown character: ${id}`)
  return character
}

export function builtInCharactersByCategory(
  category: CharacterCategoryId,
): Character[] {
  return BUILT_IN_CHARACTERS.filter((c) => c.category === category)
}
