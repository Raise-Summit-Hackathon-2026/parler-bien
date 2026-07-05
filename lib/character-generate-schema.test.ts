import { describe, expect, test } from "bun:test"

import {
  generatedPayloadToCharacter,
  levelIdForIndex,
  validateGeneratedCharacterPayload,
  validateGeneratedLevelPayload,
  type GeneratedCharacterPayload,
} from "./character-generate-schema"

const sampleLevel = {
  title: "Check in at the desk",
  subtitle: "Greet the clerk and confirm your reservation",
  goal: "Complete hotel check-in smoothly",
  meterLabel: "Confidence",
  winMessage: "You're checked in and ready to practice.",
  personaOverlay:
    "SCENARIO: Hotel front desk. Meter 0-100, start 15, goal at 90. Reward clear pronunciation.",
  openingLine: { text: "Bonjour, bienvenue.", hint: "Hello, welcome." },
  starters: [
    { text: "J'ai une réservation.", hint: "I have a reservation." },
    { text: "Voici mon passeport.", hint: "Here is my passport." },
    { text: "À quelle heure est le petit-déjeuner?", hint: "What time is breakfast?" },
  ],
}

const samplePayload: GeneratedCharacterPayload = {
  title: "The Hotel Clerk",
  tagline: "Practice front-desk conversations",
  persona:
    "You are a professional hotel clerk. The character is {characterGender} and approximately 30-40 years old.",
  voice: {
    ageRange: "30-40",
    gender: "random",
    tone: "Professional and welcoming",
  },
  imagePrompt:
    "Elegant hotel lobby with reception desk, warm cinematic illustration, no text, no logos",
  liveAvatarId: "9c59a215-4c9f-478f-9d95-edca74c7b0d0",
  levels: [sampleLevel],
}

describe("validateGeneratedLevelPayload", () => {
  test("accepts a valid generated level", () => {
    expect(validateGeneratedLevelPayload(sampleLevel)).toBe(true)
  })

  test("rejects levels without three starters", () => {
    expect(
      validateGeneratedLevelPayload({
        ...sampleLevel,
        starters: sampleLevel.starters.slice(0, 2),
      }),
    ).toBe(false)
  })
})

describe("validateGeneratedCharacterPayload", () => {
  test("accepts a valid single-level character", () => {
    expect(validateGeneratedCharacterPayload(samplePayload, 1)).toBe(true)
  })

  test("accepts a valid multi-level character", () => {
    const payload: GeneratedCharacterPayload = {
      ...samplePayload,
      levels: [
        sampleLevel,
        {
          ...sampleLevel,
          title: "Handle a complaint",
          subtitle: "Stay calm while resolving a room issue",
          goal: "Resolve the guest complaint professionally",
        },
      ],
    }

    expect(validateGeneratedCharacterPayload(payload, 2)).toBe(true)
  })

  test("rejects payloads with the wrong level count", () => {
    expect(validateGeneratedCharacterPayload(samplePayload, 3)).toBe(false)
  })
})

describe("generatedPayloadToCharacter", () => {
  test("maps a single level to main", () => {
    const character = generatedPayloadToCharacter(samplePayload, {
      id: "char-1",
      languageId: "fr",
      sourceLabel: "Hotel training PDF",
    })

    expect(character.levels).toHaveLength(1)
    const level = character.levels[0]
    expect(level?.id).toBe("main")
    expect(level?.kind).toBe("voice")
    if (level?.kind === "voice") {
      expect(level.mode).toBe("roleplay")
      expect(level.goal).toBe(sampleLevel.goal)
      expect(level.personaOverlay).toBe(sampleLevel.personaOverlay)
      expect(level.content?.fr?.openingLine).toEqual(sampleLevel.openingLine)
    }
  })

  test("maps multiple levels with stable ids", () => {
    const payload: GeneratedCharacterPayload = {
      ...samplePayload,
      levels: [
        sampleLevel,
        {
          ...sampleLevel,
          title: "Handle a complaint",
          subtitle: "Stay calm while resolving a room issue",
        },
        {
          ...sampleLevel,
          title: "Explain hotel amenities",
          subtitle: "Guide a guest through services and facilities",
        },
      ],
    }

    const character = generatedPayloadToCharacter(payload, {
      id: "char-2",
      languageId: "fr",
    })

    expect(character.levels.map((level) => level.id)).toEqual(["main", "level-2", "level-3"])
    expect(levelIdForIndex(0)).toBe("main")
    expect(levelIdForIndex(2)).toBe("level-3")
  })
})
