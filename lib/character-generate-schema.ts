import type { Character } from "@/lib/character"
import type { LanguageId } from "@/lib/languages"

export const generatedCharacterJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short scenario title, e.g. The Hotel Clerk" },
    tagline: { type: "string", description: "One-line hook for the scenario card" },
    goal: { type: "string", description: "What the user must achieve to win" },
    meterLabel: { type: "string", description: "Short label for the progress meter, e.g. Trust" },
    winMessage: { type: "string", description: "Celebration message when goal is achieved" },
    persona: {
      type: "string",
      description:
        "Full character instructions including {characterGender} placeholder, age range, meter rules (0-100), goal_achieved at >=90, and pronunciation scoring. Match the style of existing roleplay scenarios.",
    },
    voice: {
      type: "object",
      properties: {
        ageRange: { type: "string" },
        gender: {
          type: "string",
          enum: ["male", "female", "random", "opposite-speaker"],
          description:
            "Character voice gender behavior. Prefer random unless the source clearly implies a specific gender. Use opposite-speaker only for coach/teacher-style agents.",
        },
        voices: {
          type: "object",
          description:
            "Optional Gemini voice overrides by resolved character gender. Choose distinct voices only when it helps the agent feel specific.",
          properties: {
            female: { type: "string" },
            male: { type: "string" },
            default: { type: "string" },
          },
          additionalProperties: false,
        },
        tone: { type: "string" },
      },
      required: ["ageRange", "gender", "tone"],
      additionalProperties: false,
    },
    openingLine: {
      type: "object",
      properties: {
        text: { type: "string", description: "Character's first line in the target language" },
        hint: { type: "string", description: "Short English gloss" },
      },
      required: ["text", "hint"],
      additionalProperties: false,
    },
    starters: {
      type: "array",
      description: "Exactly 3 example sentences the user could say to start or continue",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          hint: { type: "string" },
        },
        required: ["text", "hint"],
        additionalProperties: false,
      },
    },
    imagePrompt: {
      type: "string",
      description:
        "Cinematic scene illustration prompt for the scenario setting. End with: cinematic illustration, no text, no logos",
    },
  },
  required: [
    "title",
    "tagline",
    "goal",
    "meterLabel",
    "winMessage",
    "persona",
    "voice",
    "openingLine",
    "starters",
    "imagePrompt",
  ],
  additionalProperties: false,
} as const

export type GeneratedCharacterPayload = {
  title: string
  tagline: string
  goal: string
  meterLabel: string
  winMessage: string
  persona: string
  voice: {
    ageRange: string
    gender: "male" | "female" | "random" | "opposite-speaker"
    voices?: { female?: string; male?: string; default?: string }
    tone: string
  }
  openingLine: { text: string; hint: string }
  starters: Array<{ text: string; hint: string }>
  imagePrompt: string
}

const characterObjectSchema = {
  type: "object",
  properties: generatedCharacterJsonSchema.properties,
  required: generatedCharacterJsonSchema.required,
  additionalProperties: false,
} as const

export function buildGeneratedCharactersBatchSchema(count: number) {
  return {
    type: "object",
    properties: {
      characters: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: characterObjectSchema,
      },
    },
    required: ["characters"],
    additionalProperties: false,
  } as const
}

function isGeneratedVoiceMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const voices = value as { female?: unknown; male?: unknown; default?: unknown }
  return (
    (voices.female === undefined || typeof voices.female === "string") &&
    (voices.male === undefined || typeof voices.male === "string") &&
    (voices.default === undefined || typeof voices.default === "string")
  )
}

export function validateGeneratedCharacterPayload(
  parsed: unknown,
): parsed is GeneratedCharacterPayload {
  if (!parsed || typeof parsed !== "object") return false
  const payload = parsed as GeneratedCharacterPayload

  return (
    typeof payload.title === "string" &&
    typeof payload.tagline === "string" &&
    typeof payload.goal === "string" &&
    typeof payload.meterLabel === "string" &&
    typeof payload.winMessage === "string" &&
    typeof payload.persona === "string" &&
    !!payload.voice &&
    typeof payload.voice.ageRange === "string" &&
    ["male", "female", "random", "opposite-speaker"].includes(payload.voice.gender) &&
    (payload.voice.voices === undefined || isGeneratedVoiceMap(payload.voice.voices)) &&
    typeof payload.voice.tone === "string" &&
    !!payload.openingLine &&
    typeof payload.openingLine.text === "string" &&
    typeof payload.openingLine.hint === "string" &&
    Array.isArray(payload.starters) &&
    payload.starters.length >= 3 &&
    typeof payload.imagePrompt === "string"
  )
}

export function generatedPayloadToCharacter(
  payload: GeneratedCharacterPayload,
  opts: { id: string; languageId: LanguageId; sourceLabel?: string },
): Character {
  return {
    id: opts.id,
    name: payload.title,
    tagline: payload.tagline,
    category: "everyday",
    avatarPrompt: payload.imagePrompt,
    voice: payload.voice,
    persona: payload.persona,
    primaryLanguageId: opts.languageId,
    sourceLabel: opts.sourceLabel,
    levels: [
      {
        kind: "voice",
        id: "main",
        title: payload.title,
        subtitle: payload.tagline,
        goal: payload.goal,
        meterLabel: payload.meterLabel,
        winMessage: payload.winMessage,
        content: {
          [opts.languageId]: {
            openingLine: payload.openingLine,
            starters: payload.starters,
          },
        },
      },
    ],
  }
}
