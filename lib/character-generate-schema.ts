import type { Character } from "@/lib/character"
import { LANGUAGE_IDS, type LanguageId } from "@/lib/languages"
import {
  LIVE_AVATAR_CATALOG_IDS,
  validateGeneratedLiveAvatarId,
} from "@/lib/liveavatar"

const openingLineSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: "Character's first line in this language" },
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

const languageContentSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Level title translated into this language",
    },
    subtitle: {
      type: "string",
      description: "Level subtitle translated into this language",
    },
    winMessage: {
      type: "string",
      description: "Celebration message translated into this language",
    },
    openingLine: openingLineSchema,
    starters: startersSchema,
  },
  required: ["title", "subtitle", "winMessage", "openingLine", "starters"],
  additionalProperties: false,
} as const

const multilingualContentSchema = {
  type: "object",
  description:
    "Localized copy, opening line, and starters for every supported practice language (French, English, Spanish, Russian)",
  properties: Object.fromEntries(
    LANGUAGE_IDS.map((id) => [id, languageContentSchema]),
  ),
  required: [...LANGUAGE_IDS],
  additionalProperties: false,
} as const

function primaryLanguageContentSchema(languageId: LanguageId) {
  return {
    type: "object",
    description: `Localized copy for the user's selected practice language (${languageId})`,
    properties: {
      [languageId]: languageContentSchema,
    },
    required: [languageId],
    additionalProperties: false,
  } as const
}

const localizedMetaSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Character name translated into this language",
    },
    tagline: {
      type: "string",
      description: "Character tagline translated into this language",
    },
  },
  required: ["name", "tagline"],
  additionalProperties: false,
} as const

const multilingualMetaSchema = {
  type: "object",
  description:
    "Character name and tagline localized for every supported practice language",
  properties: Object.fromEntries(
    LANGUAGE_IDS.map((id) => [id, localizedMetaSchema]),
  ),
  required: [...LANGUAGE_IDS],
  additionalProperties: false,
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
    content: multilingualContentSchema,
  },
  required: [
    "title",
    "subtitle",
    "goal",
    "meterLabel",
    "winMessage",
    "personaOverlay",
    "content",
  ],
  additionalProperties: false,
} as const

export type GeneratedLevelLocalizedContent = {
  title: string
  subtitle: string
  winMessage: string
  openingLine: { text: string; hint: string }
  starters: Array<{ text: string; hint: string }>
}

export type GeneratedLocalizedMeta = {
  name: string
  tagline: string
}

export type GeneratedLevelPayload = {
  title: string
  subtitle: string
  goal: string
  meterLabel: string
  winMessage: string
  personaOverlay: string
  content: Record<LanguageId, GeneratedLevelLocalizedContent>
}

export const generatedCharacterJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Character name in English, e.g. The Hotel Clerk" },
    tagline: { type: "string", description: "One-line hook for the character card, in English" },
    i18n: multilingualMetaSchema,
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
  required: ["title", "tagline", "i18n", "persona", "voice", "imagePrompt", "liveAvatarId", "levels"],
  additionalProperties: false,
} as const

export type GeneratedCharacterPayload = {
  title: string
  tagline: string
  i18n: Record<LanguageId, GeneratedLocalizedMeta>
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

export function buildGeneratedCharacterSchema(
  levelCount: number,
  primaryLanguageId: LanguageId,
) {
  const levelSchema = {
    ...generatedLevelJsonSchema,
    properties: {
      ...generatedLevelJsonSchema.properties,
      content: primaryLanguageContentSchema(primaryLanguageId),
    },
  } as const

  return {
    type: "object",
    properties: {
      ...generatedCharacterJsonSchema.properties,
      levels: {
        type: "array",
        description: "Ordered practice steps on the learning track, easier to harder",
        minItems: levelCount,
        maxItems: levelCount,
        items: levelSchema,
      },
    },
    required: generatedCharacterJsonSchema.required,
    additionalProperties: false,
  } as const
}

export function buildTranslationSchema(
  levelCount: number,
  targetLanguageIds: LanguageId[],
) {
  const translatedContentSchema = {
    type: "object",
    properties: Object.fromEntries(
      targetLanguageIds.map((id) => [id, languageContentSchema]),
    ),
    required: [...targetLanguageIds],
    additionalProperties: false,
  } as const

  return {
    type: "object",
    properties: {
      levels: {
        type: "array",
        description: "Translated level content in the same order as the source track",
        minItems: levelCount,
        maxItems: levelCount,
        items: {
          type: "object",
          properties: {
            content: translatedContentSchema,
          },
          required: ["content"],
          additionalProperties: false,
        },
      },
    },
    required: ["levels"],
    additionalProperties: false,
  } as const
}

export type GeneratedTranslationPayload = {
  levels: Array<{
    content: Partial<Record<LanguageId, GeneratedLevelLocalizedContent>>
  }>
}

export function mergeTranslatedLevels(
  payload: GeneratedCharacterPayload,
  translation: GeneratedTranslationPayload,
) {
  payload.levels.forEach((level, index) => {
    const translated = translation.levels[index]?.content
    if (!translated) return
    level.content = { ...level.content, ...translated }
  })
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

function isLanguageContent(value: unknown): value is GeneratedLevelLocalizedContent {
  if (!value || typeof value !== "object") return false
  const content = value as GeneratedLevelLocalizedContent
  return (
    typeof content.title === "string" &&
    typeof content.subtitle === "string" &&
    typeof content.winMessage === "string" &&
    !!content.openingLine &&
    typeof content.openingLine.text === "string" &&
    typeof content.openingLine.hint === "string" &&
    Array.isArray(content.starters) &&
    content.starters.length >= 3 &&
    content.starters.every(isStarter)
  )
}

function isLocalizedMeta(value: unknown): value is GeneratedLocalizedMeta {
  if (!value || typeof value !== "object") return false
  const meta = value as GeneratedLocalizedMeta
  return typeof meta.name === "string" && typeof meta.tagline === "string"
}

export function validateGeneratedLevelPayload(
  parsed: unknown,
  options?: { primaryLanguageId?: LanguageId },
): parsed is GeneratedLevelPayload {
  if (!parsed || typeof parsed !== "object") return false
  const level = parsed as GeneratedLevelPayload

  if (
    typeof level.title !== "string" ||
    typeof level.subtitle !== "string" ||
    typeof level.goal !== "string" ||
    typeof level.meterLabel !== "string" ||
    typeof level.winMessage !== "string" ||
    typeof level.personaOverlay !== "string" ||
    !level.content ||
    typeof level.content !== "object"
  ) {
    return false
  }

  const languageIds = options?.primaryLanguageId
    ? [options.primaryLanguageId]
    : LANGUAGE_IDS

  return languageIds.every((languageId) =>
    isLanguageContent(level.content[languageId]),
  )
}

export function validateGeneratedCharacterPayload(
  parsed: unknown,
  levelCount?: number,
  options?: { primaryLanguageId?: LanguageId },
): parsed is GeneratedCharacterPayload {
  if (!parsed || typeof parsed !== "object") return false
  const payload = parsed as GeneratedCharacterPayload

  if (
    typeof payload.title !== "string" ||
    typeof payload.tagline !== "string" ||
    !payload.i18n ||
    typeof payload.i18n !== "object" ||
    !LANGUAGE_IDS.every((languageId) => isLocalizedMeta(payload.i18n[languageId])) ||
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

  return payload.levels.every((level) =>
    validateGeneratedLevelPayload(level, options),
  )
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
    name: payload.i18n[opts.languageId]?.name ?? payload.title,
    tagline: payload.i18n[opts.languageId]?.tagline ?? payload.tagline,
    i18n: payload.i18n,
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
    levels: payload.levels.map((level, index) => {
      const localized = level.content[opts.languageId]
      return {
        kind: "voice" as const,
        id: levelIdForIndex(index),
        title: localized?.title ?? level.title,
        subtitle: localized?.subtitle ?? level.subtitle,
        mode: "roleplay" as const,
        goal: level.goal,
        meterLabel: level.meterLabel,
        winMessage: localized?.winMessage ?? level.winMessage,
        personaOverlay: level.personaOverlay,
        content: level.content,
      }
    }),
  }
}
