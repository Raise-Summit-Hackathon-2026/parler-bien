import { describe, expect, test } from "bun:test"

import {
  CATEGORIES,
  characterLevelScenario,
  isLevelPlayable,
  levelBadge,
  playableLevels,
  resolveCharacterGender,
  scenarioToCharacter,
  stableCharacterGender,
  categoryScoresPronunciation,
  type Character,
} from "@/lib/character"
import {
  BUILT_IN_CHARACTERS,
  builtInCharactersByCategory,
  getBuiltInCharacter,
  isBuiltInCharacterId,
} from "@/lib/characters/index"
import type { Scenario } from "@/lib/character"

const sampleCharacter: Character = {
  id: "test-char",
  name: "Test Char",
  tagline: "A test",
  category: "professional",
  avatarPrompt: "portrait",
  voice: { ageRange: "30-40", tone: "calm" },
  deliveryStyle: "steady",
  coachingStyle: "kind",
  persona: "BASE PERSONA",
  levels: [
    {
      kind: "voice",
      id: "l1",
      title: "Level one",
      subtitle: "First",
      mode: "roleplay",
      goal: "Win",
      meterLabel: "Trust",
      winMessage: "Done",
      personaOverlay: "OVERLAY",
      content: {
        fr: {
          openingLine: { text: "Bonjour", hint: "Hello" },
          starters: [{ text: "Salut", hint: "Hi" }],
        },
      },
    },
    {
      kind: "gesture",
      id: "l2",
      title: "Gesture level",
      subtitle: "Second",
      steps: [],
      winMessage: "Nice",
    },
  ],
}

describe("characterLevelScenario", () => {
  test("builds a wire Scenario from a voice level", () => {
    const scenario = characterLevelScenario(sampleCharacter, 0, "fr")
    expect(scenario.id).toBe("custom:test-char-l1")
    expect(scenario.title).toBe("Level one")
    expect(scenario.persona).toBe("BASE PERSONA\n\nOVERLAY")
    expect(scenario.goal).toBe("Win")
    expect(scenario.meterLabel).toBe("Trust")
    expect(scenario.mode).toBe("roleplay")
    expect(scenario.deliveryStyle).toBe("steady")
    expect(scenario.coachingStyle).toBe("kind")
    expect(scenario.content.fr?.openingLine?.text).toBe("Bonjour")
    expect(scenario.primaryLanguageId).toBe("fr")
  })

  test("omits overlay when absent and throws on gesture levels", () => {
    const noOverlay: Character = {
      ...sampleCharacter,
      levels: [{ ...sampleCharacter.levels[0], personaOverlay: undefined } as never],
    }
    expect(characterLevelScenario(noOverlay, 0, "fr").persona).toBe("BASE PERSONA")
    expect(() => characterLevelScenario(sampleCharacter, 1, "fr")).toThrow()
  })
})

describe("scenarioToCharacter", () => {
  test("wraps a legacy Scenario as a single-voice-level Character", () => {
    const legacy: Scenario = {
      id: "custom:abc",
      title: "The Clerk",
      tagline: "Check in",
      goal: "Get a room",
      meterLabel: "Patience",
      winMessage: "Booked!",
      persona: "You are a clerk",
      voice: { ageRange: "40-50", tone: "brisk" },
      content: { fr: { openingLine: { text: "Oui?", hint: "Yes?" }, starters: [] } },
      imagePrompt: "hotel desk",
      primaryLanguageId: "fr",
    }
    const character = scenarioToCharacter(legacy, "row-uuid")
    expect(character.id).toBe("row-uuid")
    expect(character.name).toBe("The Clerk")
    expect(character.category).toBe("everyday")
    expect(character.levels).toHaveLength(1)
    const level = character.levels[0]
    expect(level.kind).toBe("voice")
    if (level.kind === "voice") {
      expect(level.goal).toBe("Get a room")
      expect(level.content?.fr?.openingLine?.text).toBe("Oui?")
    }
    // round-trip: converting back yields the same persona/goal
    const back = characterLevelScenario(character, 0, "fr")
    expect(back.persona).toBe("You are a clerk")
    expect(back.goal).toBe("Get a room")
  })
})

describe("character gender", () => {
  test("stableCharacterGender is deterministic for the same seed", () => {
    expect(stableCharacterGender("captain-eva:1")).toBe(stableCharacterGender("captain-eva:1"))
    expect(stableCharacterGender("vendor:0")).not.toBe(stableCharacterGender("vendor:1"))
  })

  test("infers female gender for Captain Eva", () => {
    const eva = getBuiltInCharacter("captain-eva")
    const scenario = characterLevelScenario(eva, 0, "en")
    expect(resolveCharacterGender(scenario, undefined, "captain-eva:0")).toBe("female")
  })

  test("avatar and voice gender use the same seed in resolveCharacterGender", () => {
    const vendor = getBuiltInCharacter("vendor")
    const scenario = characterLevelScenario(vendor, 0, "en")
    const seed = "vendor:0"
    const genderA = resolveCharacterGender(scenario, undefined, seed)
    const genderB = resolveCharacterGender(scenario, undefined, seed)
    expect(genderA).toBe(genderB)
  })
  test("characterLevelScenario includes category for prompt routing", () => {
    const scenario = characterLevelScenario(sampleCharacter, 0, "fr")
    expect(scenario.category).toBe("professional")
  })

  test("categoryScoresPronunciation is true only for languages", () => {
    expect(categoryScoresPronunciation("languages")).toBe(true)
    expect(categoryScoresPronunciation("professional")).toBe(false)
    expect(categoryScoresPronunciation("sports")).toBe(false)
    expect(categoryScoresPronunciation("everyday")).toBe(false)
  })
})

describe("categories & badges", () => {
  test("CATEGORIES has the four spec ids in order", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      "languages",
      "professional",
      "sports",
      "everyday",
    ])
  })

  test("levelBadge summarizes multi-level characters", () => {
    expect(levelBadge(sampleCharacter)).toBe("2 levels · Voice · Camera")
    const single = scenarioToCharacter(
      characterLevelScenario(sampleCharacter, 0, "fr"),
      "x",
    )
    expect(levelBadge(single)).toBeNull()
  })
})

describe("built-in characters", () => {
  test("every category has at least one character", () => {
    for (const cat of CATEGORIES) {
      expect(builtInCharactersByCategory(cat.id).length).toBeGreaterThan(0)
    }
  })

  test("ids are unique and resolvable", () => {
    const ids = BUILT_IN_CHARACTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(isBuiltInCharacterId(id)).toBe(true)
      expect(getBuiltInCharacter(id).id).toBe(id)
    }
    expect(isBuiltInCharacterId("nope")).toBe(false)
  })

  test("captain-eva is featured with 3 playable and 2 locked levels", () => {
    const eva = getBuiltInCharacter("captain-eva")
    expect(eva.featured).toBe(true)
    expect(eva.category).toBe("professional")
    expect(playableLevels(eva).map((l) => l.kind)).toEqual(["voice", "gesture", "voice"])
    expect(eva.levels).toHaveLength(5)
    expect(eva.levels.filter((l) => !isLevelPlayable(l))).toHaveLength(2)
  })

  test("every built-in character has at least 3 playable levels and locked teasers", () => {
    for (const character of BUILT_IN_CHARACTERS) {
      const available = playableLevels(character)
      const locked = character.levels.filter((l) => !isLevelPlayable(l))
      expect(available.length).toBeGreaterThanOrEqual(3)
      expect(locked.length).toBeGreaterThanOrEqual(1)
    }
  })
})
