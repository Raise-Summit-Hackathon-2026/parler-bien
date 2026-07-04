import { describe, expect, test } from "bun:test"

import { buildSpeechInput, selectVoice } from "./tts"

describe("buildSpeechInput", () => {
  test("preserves inline delivery tags as transcript cues", () => {
    const text = "[whispers] Bonjour. [laughs softly] Incroyable."
    const input = buildSpeechInput(text, "character", {
      accent: "Parisian French",
      gender: "female",
      tone: "Reserved but playful local at a cafe.",
    })

    expect(input).toMatch(/Inline square-bracket tags inside the transcript/)
    expect(input).toMatch(/Never read bracketed tags aloud/)
    expect(input).toMatch(/apply them at the exact point where they appear/)
    expect(input.indexOf("PERFORMANCE:")).toBeLessThan(input.indexOf("TRANSCRIPT:"))
    expect(input.split("TRANSCRIPT:\n").at(1)).toBe(text)
  })

  test("accepts free-form Gemini delivery tags", () => {
    const text = "[slowly, with gravity] Ecoutez bien."
    const input = buildSpeechInput(text, "phrase", {
      accent: "Parisian French",
    })

    expect(input).toMatch(/\[slowly, with gravity\] Ecoutez bien\./)
    expect(input.split("TRANSCRIPT:\n").at(1)).toBe(text)
  })

  test("guides non-verbal cues without speaking tag names", () => {
    const text = "[gasps] It vanished! [giggles] Look behind your ear."
    const input = buildSpeechInput(text, "character", {
      accent: "American English",
      gender: "female",
      tone: "Playful stage magician.",
    })

    expect(input).toMatch(/\[giggles\]/)
    expect(input).toMatch(/\[gasps\]/)
    expect(input).toMatch(/For non-verbal cues, make the sound or vocal reaction/)
    expect(input.split("TRANSCRIPT:\n").at(1)).toBe(text)
  })

  test("guides subtle ambience and background music cues", () => {
    const text =
      "[soft cafe ambience] Welcome in. [gentle background music] Let's practice together."
    const input = buildSpeechInput(text, "character", {
      accent: "American English",
      gender: "female",
      tone: "Warm cafe tutor.",
    })

    expect(input).toMatch(/\[soft cafe ambience\]/)
    expect(input).toMatch(/\[gentle background music\]/)
    expect(input).toMatch(/Keep ambience and music quiet/)
    expect(input).toMatch(/non-lyrical/)
    expect(input.split("TRANSCRIPT:\n").at(1)).toBe(text)
  })

  test("uses an explicit agent voice before gender defaults", () => {
    expect(selectVoice("female", "Callirrhoe")).toBe("Callirrhoe")
    expect(selectVoice("male", "Fenrir")).toBe("Fenrir")
    expect(selectVoice("male", "NotARealVoice")).toBe("Charon")
    expect(selectVoice("female")).toBe("Sulafat")
  })
})
