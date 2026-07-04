import { scenarioToCharacter, type Character } from "@/lib/character"
import type { Scenario } from "@/lib/scenarios"
import type { CharacterRow } from "@/lib/workspace-types"

function isCharacterShape(value: Character | Scenario): value is Character {
  return Array.isArray((value as Character).levels)
}

/** Old rows store a `Scenario`; new rows store a `Character`. Always trust the row uuid as id. */
export function rowToCharacter(row: CharacterRow): Character {
  if (isCharacterShape(row.scenario)) {
    return { ...row.scenario, id: row.id }
  }
  return scenarioToCharacter(row.scenario, row.id)
}
