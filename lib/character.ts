import type { GestureStep } from "@/lib/gestures"
import { LANGUAGES, type LanguageId, type Region } from "@/lib/languages"
import type { SentenceSuggestion, SpeakerProfile } from "@/lib/types"

export type CharacterCategoryId =
  | "languages"
  | "professional"
  | "coaching"
  | "sports"
  | "everyday"

export type CharacterCategory = {
  id: CharacterCategoryId
  label: string
  tagline: string
}

export const CATEGORIES: CharacterCategory[] = [
  {
    id: "languages",
    label: "Languages",
    tagline: "Order, haggle, and chat with native-speaking locals.",
  },
  {
    id: "professional",
    label: "Professional",
    tagline: "Job skills, service under pressure, interviews.",
  },
  {
    id: "coaching",
    label: "Coaching & Reflection",
    tagline: "Open conversations that help you think out loud.",
  },
  {
    id: "sports",
    label: "Sports",
    tagline: "Lead a team, rally a locker room, coach out loud.",
  },
  {
    id: "everyday",
    label: "Everyday Life",
    tagline: "Real situations you'll actually run into.",
  },
]

export type VoiceLevelMode = "roleplay" | "coach" | "open"

export type VoiceLevel = {
  kind: "voice"
  id: string
  title: string
  subtitle: string
  /** roleplay (default): goal + meter. coach: pronunciation drilling, no meter. open: free conversation, no scoring. */
  mode?: VoiceLevelMode
  goal?: string
  meterLabel?: string
  winMessage?: string
  /** Appended to Character.persona for this level */
  personaOverlay?: string
  /** Per-language opening line + starters, same shape Scenario carries */
  content?: Partial<Record<LanguageId, ScenarioContent>>
}

export type GestureLevel = {
  kind: "gesture"
  id: string
  title: string
  subtitle: string
  steps: GestureStep[]
  winMessage: string
  holdMs?: number
}

export type Level = VoiceLevel | GestureLevel

export type Character = {
  /** Built-in slug (e.g. "captain-eva") or DB row uuid */
  id: string
  name: string
  tagline: string
  category: CharacterCategoryId
  avatarPrompt: string
  voice: Scenario["voice"]
  deliveryStyle?: string
  coachingStyle?: string
  persona: string
  featured?: boolean
  /** Set on AI-generated characters */
  primaryLanguageId?: LanguageId
  sourceLabel?: string
  levels: Level[]
}

export function characterLevelScenario(
  character: Character,
  levelIndex: number,
  languageId: LanguageId,
): Scenario {
  const level = character.levels[levelIndex]
  if (!level || level.kind !== "voice") {
    throw new Error(`Level ${levelIndex} of ${character.id} is not a voice level`)
  }

  const persona = level.personaOverlay
    ? `${character.persona}\n\n${level.personaOverlay}`
    : character.persona

  return {
    id: `custom:${character.id}-${level.id}`,
    title: level.title,
    tagline: level.subtitle,
    goal: level.goal ?? null,
    meterLabel: level.meterLabel ?? null,
    winMessage: level.winMessage ?? null,
    persona,
    voice: character.voice,
    mode: level.mode ?? "roleplay",
    deliveryStyle: character.deliveryStyle,
    coachingStyle: character.coachingStyle,
    content: level.content ?? {},
    imagePrompt: character.avatarPrompt,
    primaryLanguageId: character.primaryLanguageId ?? languageId,
    sourceLabel: character.sourceLabel,
  }
}

export function scenarioToCharacter(
  scenario: Scenario,
  id: string,
  category: CharacterCategoryId = "everyday",
): Character {
  return {
    id,
    name: scenario.title,
    tagline: scenario.tagline,
    category,
    avatarPrompt: scenario.imagePrompt,
    voice: scenario.voice,
    deliveryStyle: scenario.deliveryStyle,
    coachingStyle: scenario.coachingStyle,
    persona: scenario.persona,
    primaryLanguageId: scenario.primaryLanguageId,
    sourceLabel: scenario.sourceLabel,
    levels: [
      {
        kind: "voice",
        id: "main",
        title: scenario.title,
        subtitle: scenario.tagline,
        mode: scenario.mode ?? "roleplay",
        goal: scenario.goal ?? undefined,
        meterLabel: scenario.meterLabel ?? undefined,
        winMessage: scenario.winMessage ?? undefined,
        content: scenario.content,
      },
    ],
  }
}

export function levelBadge(character: Character): string | null {
  if (character.levels.length <= 1) return null
  const kinds: string[] = []
  if (character.levels.some((l) => l.kind === "voice")) kinds.push("Voice")
  if (character.levels.some((l) => l.kind === "gesture")) kinds.push("Camera")
  return `${character.levels.length} levels · ${kinds.join(" · ")}`
}

// ---------------------------------------------------------------------------
// Wire layer (folded in from the former lib/scenarios.ts).
// A `Scenario` is the flattened, per-level payload sent over the wire to the
// score/prompt routes. Characters produce Scenarios via characterLevelScenario.
// ---------------------------------------------------------------------------

export type CustomScenarioId = `custom:${string}`

export type ScenarioId = string

export type ScenarioContent = {
  openingLine: SentenceSuggestion | null
  starters: SentenceSuggestion[]
}

export type Scenario = {
  id: ScenarioId
  title: string
  tagline: string
  goal: string | null
  meterLabel: string | null
  winMessage: string | null
  persona: string
  voice: {
    ageRange: string
    tone: string
    gender?: CharacterGenderMode
    voices?: CharacterVoiceMap
  }
  /** Prompt mode carried from the Character's voice level. Default "roleplay". */
  mode?: "roleplay" | "coach" | "open"
  deliveryStyle?: string
  coachingStyle?: string
  content: Partial<Record<LanguageId, ScenarioContent>>
  imagePrompt: string
  /** Set on AI-generated custom scenarios */
  primaryLanguageId?: LanguageId
  createdAt?: number
  sourceLabel?: string
}

export type CharacterGender = "male" | "female"
export type CharacterGenderMode = CharacterGender | "random" | "opposite-speaker"
export type CharacterVoiceMap = Partial<Record<CharacterGender, string>> & {
  default?: string
}

export function resolveCharacterGender(
  scenario: Pick<Scenario, "mode" | "voice">,
  speakerGender?: SpeakerProfile["gender"],
  randomGender: CharacterGender = "female",
): CharacterGender {
  const mode =
    scenario.voice.gender ??
    (scenario.mode === "coach" ? "opposite-speaker" : "random")

  if (mode === "male" || mode === "female") return mode
  if (mode === "random") return randomGender
  if (speakerGender === "male") return "female"
  if (speakerGender === "female") return "male"
  return randomGender
}

export function randomCharacterGender(): CharacterGender {
  return Math.random() < 0.5 ? "female" : "male"
}

export function resolveCharacterVoice(
  scenario: Pick<Scenario, "voice">,
  gender: CharacterGender,
): string | undefined {
  return scenario.voice.voices?.[gender] ?? scenario.voice.voices?.default
}

export function isCustomScenarioId(value: string): value is CustomScenarioId {
  return value.startsWith("custom:")
}

export function resolveScenario(
  scenarioId: ScenarioId,
  customScenario?: Scenario | null,
): Scenario {
  if (!customScenario || customScenario.id !== scenarioId) {
    throw new Error("Custom scenario payload is required")
  }
  return customScenario
}

export function getScenarioLanguageIds(scenario: Scenario): LanguageId[] {
  return LANGUAGES.map((language) => language.id).filter((languageId) =>
    Boolean(scenario.content[languageId]),
  )
}

/** The language the session actually practices: the requested one when the
 * scenario has content for it, else the scenario's primary/first language. */
export function getScenarioFallbackLanguageId(
  scenario: Scenario,
  languageId: LanguageId,
): LanguageId {
  if (scenario.content[languageId]) return languageId

  const primary = scenario.primaryLanguageId
  if (primary && scenario.content[primary]) return primary

  return getScenarioLanguageIds(scenario)[0] ?? languageId
}

export function getScenarioContent(
  scenario: Scenario,
  languageId: LanguageId,
): ScenarioContent {
  return (
    scenario.content[getScenarioFallbackLanguageId(scenario, languageId)] ??
    EMPTY_CONTENT
  )
}

export function formatPersona(
  scenario: Scenario,
  characterGender: CharacterGender,
  languageName: string,
  region: Region,
): string {
  const genderLabel = characterGender === "male" ? "male" : "female"
  const persona = scenario.persona.replaceAll("{characterGender}", genderLabel)

  return `${persona}

LANGUAGE AND SETTING: Conduct the entire conversation in ${languageName} with a natural ${region.accent} accent and vocabulary. The scene is set in ${region.city} — adapt place names, currency, and cultural references naturally to that city. Your reply.text must be in ${languageName}; reply.tts_text must contain the same spoken words as reply.text, with optional audio-only bracketed delivery cues; reply.hint is a short English gloss (or a brief usage cue if the conversation is already in English).`
}

const EMPTY_CONTENT: ScenarioContent = { openingLine: null, starters: [] }
