import type { Character } from "@/lib/character"
import type { LanguageId } from "@/lib/languages"
import {
  LIVE_AVATAR_CATALOG_IDS,
  validateGeneratedLiveAvatarId,
} from "@/lib/liveavatar"

const openingLineSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: "Character's first line in the target language" },
    hint: { type: "string", description: "Short English gloss" },
  },
  required: ["text", "hint"],
  additionalProperties: false,
} as const

const startersSchema = {
  type: "array",
  description: "Exactly 3 example sentences the user could say to start or continue",
  minItems: 3,
  maxItems: 3,
  items: {
    type: "object",
    properties: {
      text: { type: "string" },
      hint: { type: "string" },
    },
    required: ["text", "hint"],
    additionalProperties: false,
  },
} as const

export const generatedLevelJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short level title shown on the track" },
    subtitle: { type: "string", description: "One-line hook for this practice step" },
    goal: { type: "string", description: "What the user must achieve to win this level" },
    meterLabel: { type: "string", description: "Legacy field; UI always shows Progress" },
    winMessage: { type: "string", description: "Celebration message when goal is achieved" },
    personaOverlay: {
      type: "string",
      description:
        "Scene-specific instructions appended to the base persona for this level. Include progress rules (0-100), goal_achieved at progress 100, and meter behavior.",
    },
    openingLine: openingLineSchema,
    starters: startersSchema,
  },
  required: [
    "title",
    "subtitle",
    "goal",
    "meterLabel",
    "winMessage",
    "personaOverlay",
    "openingLine",
    "starters",
  ],
  additionalProperties: false,
} as const

export type GeneratedLevelPayload = {
  title: string
  subtitle: string
  goal: string
  meterLabel: string
  winMessage: string
  personaOverlay: string
  openingLine: { text: string; hint: string }
  starters: Array<{ text: string; hint: string }>
}

export const generatedCharacterJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Character name, e.g. The Hotel Clerk" },
    tagline: { type: "string", description: "One-line hook for the character card" },
    persona: {
      type: "string",
      description:
        "Base character instructions including {characterGender} placeholder, age range, short spoken lines only, and instruction to score pronunciation. Level-specific meter rules go in each level's personaOverlay.",
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
    imagePrompt: {
      type: "string",
      description:
        "Cinematic scene illustration prompt for the scenario setting. End with: cinematic illustration, no text, no logos",
    },
    liveAvatarId: {
      type: "string",
      enum: LIVE_AVATAR_CATALOG_IDS,
      description:
        "Pick the LiveAvatar id that best matches the character persona (gender, profession, vibe).",
    },
    levels: {
      type: "array",
      description: "Ordered practice steps on the learning track, easier to harder",
      items: generatedLevelJsonSchema,
    },
  },
  required: ["title", "tagline", "persona", "voice", "imagePrompt", "liveAvatarId", "levels"],
  additionalProperties: false,
} as const

export type GeneratedCharacterPayload = {
  title: string
  tagline: string
  persona: string
  voice: {
    ageRange: string
    gender: "male" | "female" | "random" | "opposite-speaker"
    voices?: { female?: string; male?: string; default?: string }
    tone: string
  }
  imagePrompt: string
  liveAvatarId: string
  levels: GeneratedLevelPayload[]
}

export function buildGeneratedCharacterSchema(levelCount: number) {
  return {
    type: "object",
    properties: {
      ...generatedCharacterJsonSchema.properties,
      levels: {
        type: "array",
        description: "Ordered practice steps on the learning track, easier to harder",
        minItems: levelCount,
        maxItems: levelCount,
        items: generatedLevelJsonSchema,
      },
    },
    required: generatedCharacterJsonSchema.required,
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

function isStarter(value: unknown): value is { text: string; hint: string } {
  if (!value || typeof value !== "object") return false
  const starter = value as { text?: unknown; hint?: unknown }
  return typeof starter.text === "string" && typeof starter.hint === "string"
}

export function validateGeneratedLevelPayload(
  parsed: unknown,
): parsed is GeneratedLevelPayload {
  if (!parsed || typeof parsed !== "object") return false
  const level = parsed as GeneratedLevelPayload

  return (
    typeof level.title === "string" &&
    typeof level.subtitle === "string" &&
    typeof level.goal === "string" &&
    typeof level.meterLabel === "string" &&
    typeof level.winMessage === "string" &&
    typeof level.personaOverlay === "string" &&
    !!level.openingLine &&
    typeof level.openingLine.text === "string" &&
    typeof level.openingLine.hint === "string" &&
    Array.isArray(level.starters) &&
    level.starters.length >= 3 &&
    level.starters.every(isStarter)
  )
}

export function validateGeneratedCharacterPayload(
  parsed: unknown,
  levelCount?: number,
): parsed is GeneratedCharacterPayload {
  if (!parsed || typeof parsed !== "object") return false
  const payload = parsed as GeneratedCharacterPayload

  if (
    typeof payload.title !== "string" ||
    typeof payload.tagline !== "string" ||
    typeof payload.persona !== "string" ||
    !payload.voice ||
    typeof payload.voice.ageRange !== "string" ||
    !["male", "female", "random", "opposite-speaker"].includes(payload.voice.gender) ||
    (payload.voice.voices !== undefined && !isGeneratedVoiceMap(payload.voice.voices)) ||
    typeof payload.voice.tone !== "string" ||
    typeof payload.imagePrompt !== "string" ||
    typeof payload.liveAvatarId !== "string" ||
    !Array.isArray(payload.levels) ||
    payload.levels.length === 0
  ) {
    return false
  }

  if (levelCount !== undefined && payload.levels.length !== levelCount) {
    return false
  }

  return payload.levels.every(validateGeneratedLevelPayload)
}

export function levelIdForIndex(index: number): string {
  return index === 0 ? "main" : `level-${index + 1}`
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
    liveAvatarId: validateGeneratedLiveAvatarId(
      payload.liveAvatarId,
      payload.voice.gender,
    ),
    voice: payload.voice,
    persona: payload.persona,
    primaryLanguageId: opts.languageId,
    sourceLabel: opts.sourceLabel,
    levels: payload.levels.map((level, index) => ({
      kind: "voice" as const,
      id: levelIdForIndex(index),
      title: level.title,
      subtitle: level.subtitle,
      mode: "roleplay" as const,
      goal: level.goal,
      meterLabel: level.meterLabel,
      winMessage: level.winMessage,
      personaOverlay: level.personaOverlay,
      content: {
        [opts.languageId]: {
          openingLine: level.openingLine,
          starters: level.starters,
        },
      },
    })),
  }
}
