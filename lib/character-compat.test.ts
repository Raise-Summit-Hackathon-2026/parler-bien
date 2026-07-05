import { describe, expect, test } from "bun:test"

import { rowToCharacter } from "@/lib/character-compat"
import type { Character } from "@/lib/character"
import type { CharacterRow } from "@/lib/workspace-types"

const base = { id: "row-1", created_by: "u", workspace_id: null, created_at: "" }

describe("rowToCharacter", () => {
  test("passes through new-shape rows, forcing id to the row id", () => {
    const character: Character = {
      id: "stale-id",
      name: "New",
      tagline: "t",
      category: "everyday",
      avatarPrompt: "a",
      voice: { ageRange: "30", tone: "calm" },
      persona: "p",
      levels: [{ kind: "voice", id: "main", title: "New", subtitle: "t" }],
    }
    const row = { ...base, scenario: character } as CharacterRow
    const result = rowToCharacter(row)
    expect(result.id).toBe("row-1")
    expect(result.levels).toHaveLength(1)
    expect(result.category).toBe("everyday")
  })

  test("upgrades old Scenario-shape rows to a 1-level Character", () => {
    const row = {
      ...base,
      scenario: {
        id: "custom:old",
        title: "Old Clerk",
        tagline: "legacy",
        goal: "win",
        meterLabel: "m",
        winMessage: "w",
        persona: "p",
        voice: { ageRange: "30", tone: "t" },
        content: { fr: { openingLine: null, starters: [] } },
        imagePrompt: "i",
      },
    } as unknown as CharacterRow
    const result = rowToCharacter(row)
    expect(result.id).toBe("row-1")
    expect(result.name).toBe("Old Clerk")
    expect(result.levels).toHaveLength(1)
  })
})
