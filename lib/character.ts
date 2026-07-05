import type { GestureStep } from "@/lib/gestures"
import { LANGUAGES, type LanguageId, type Region } from "@/lib/languages"
import type { SentenceSuggestion, SpeakerProfile } from "@/lib/types"

export type CharacterCategoryId =
  | "languages"
  | "professional"
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

export type LevelStatus = "available" | "locked" | "wip"

type LevelMeta = {
  /** Defaults to "available". Locked/wip levels are visible but not playable. */
  status?: LevelStatus
  /** Badge on locked levels, e.g. "Pro" or "Coming soon" */
  lockLabel?: string
}

export type VoiceLevel = LevelMeta & {
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
  /** Label for AI replies in chat when the user plays the lead role (e.g. "Passengers"). */
  partnerName?: string
  /** Per-language opening line + starters, same shape Scenario carries */
  content?: Partial<Record<LanguageId, ScenarioContent>>
}

export type GestureLevel = LevelMeta & {
  kind: "gesture"
  id: string
  title: string
  subtitle: string
  steps: GestureStep[]
  winMessage: string
  holdMs?: number
}

export type Level = VoiceLevel | GestureLevel

export function isLevelPlayable(level: Level): boolean {
  return (level.status ?? "available") === "available"
}

export function playableLevels(character: Character): Level[] {
  return character.levels.filter(isLevelPlayable)
}

export function lastPlayableLevelIndex(character: Character): number {
  for (let i = character.levels.length - 1; i >= 0; i--) {
    if (isLevelPlayable(character.levels[i]!)) return i
  }
  return 0
}

export function nextPlayableLevelIndex(
  character: Character,
  currentIndex: number,
): number | null {
  for (let i = currentIndex + 1; i < character.levels.length; i++) {
    if (isLevelPlayable(character.levels[i]!)) return i
  }
  return null
}

export type Character = {
  /** Built-in slug (e.g. "cabin-crew") or DB row uuid */
  id: string
  name: string
  tagline: string
  category: CharacterCategoryId
  avatarPrompt: string
  /** LiveAvatar public avatar id chosen at generation time */
  liveAvatarId?: string
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
  if (!level || !isLevelPlayable(level) || level.kind !== "voice") {
    throw new Error(`Level ${levelIndex} of ${character.id} is not a playable voice level`)
  }

  const persona = level.personaOverlay
    ? `${character.persona}\n\n${level.personaOverlay}`
    : character.persona

  return {
    id: `custom:${character.id}-${level.id}`,
    title: level.title,
    tagline: level.subtitle,
    characterName: level.partnerName ?? character.name,
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
    liveAvatarId: character.liveAvatarId,
    primaryLanguageId: character.primaryLanguageId ?? languageId,
    sourceLabel: character.sourceLabel,
    category: character.category,
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
    liveAvatarId: scenario.liveAvatarId,
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
  const available = playableLevels(character)
  const lockedCount = character.levels.length - available.length
  if (available.length <= 1 && lockedCount === 0) return null
  const kinds: string[] = []
  if (available.some((l) => l.kind === "voice")) kinds.push("Voice")
  if (available.some((l) => l.kind === "gesture")) kinds.push("Camera")
  const base = `${available.length} levels · ${kinds.join(" · ")}`
  return lockedCount > 0 ? `${base} · +${lockedCount} soon` : base
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
  /** Parent character display name — used for gender inference when voice.gender is random */
  characterName?: string
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
  /** LiveAvatar public avatar id for this scenario */
  liveAvatarId?: string
  /** Set on AI-generated custom scenarios */
  primaryLanguageId?: LanguageId
  createdAt?: number
  sourceLabel?: string
  /** Drives pronunciation UI + prompts. Defaults to skill-focused when absent. */
  category?: CharacterCategoryId
}

export type CharacterGender = "male" | "female"
export type CharacterGenderMode = CharacterGender | "random" | "opposite-speaker"
export type CharacterVoiceMap = Partial<Record<CharacterGender, string>> & {
  default?: string
}

/** Pronunciation scores and word breakdown are shown only for language-learning tracks. */
export function categoryScoresPronunciation(
  category: CharacterCategoryId | undefined,
): boolean {
  return category === "languages"
}

/** Deterministic gender from a stable seed (character id + level). */
export function stableCharacterGender(seed: string): CharacterGender {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 2 === 0 ? "female" : "male"
}

/** Infer fixed gender from character name, persona, or avatar prompt. */
export function inferCharacterGenderFromHints(
  characterName: string,
  persona?: string,
  avatarPrompt?: string,
): CharacterGender | null {
  const text = `${characterName} ${persona ?? ""} ${avatarPrompt ?? ""}`.toLowerCase()

  if (
    /\bcaptain eva\b|\beva\b|female flight|female attendant|stewardess|hostess|boulang[eè]re\b|madame\b|\bshe is\b|\bwoman\b|\bfemale\b/.test(
      text,
    )
  ) {
    return "female"
  }

  if (
    /\bpedro\b|\bgraham\b|\bsilas\b|\bthaddeus\b|\bwayne\b|\bboulanger\b|\bhe is\b|\bman\b|\bmale\b/.test(
      text,
    )
  ) {
    return "male"
  }

  return null
}

export function resolveCharacterGender(
  scenario: Pick<
    Scenario,
    "mode" | "voice" | "id" | "persona" | "imagePrompt" | "characterName"
  >,
  speakerGender?: SpeakerProfile["gender"],
  genderSeed?: string,
): CharacterGender {
  const mode =
    scenario.voice.gender ??
    (scenario.mode === "coach" ? "opposite-speaker" : "random")

  if (mode === "male" || mode === "female") return mode

  if (mode === "opposite-speaker") {
    if (speakerGender === "male") return "female"
    if (speakerGender === "female") return "male"
    return stableCharacterGender(`${genderSeed ?? scenario.id ?? "coach"}:opposite`)
  }

  const inferred = inferCharacterGenderFromHints(
    scenario.characterName ?? "",
    scenario.persona,
    scenario.imagePrompt,
  )
  if (inferred) return inferred

  return stableCharacterGender(genderSeed ?? scenario.id ?? "character")
}

/** @deprecated Use stableCharacterGender with a session seed instead. */
export function randomCharacterGender(): CharacterGender {
  return stableCharacterGender(`ephemeral:${Date.now()}`)
}

export function resolveCharacterGenderFromCharacter(
  character: Pick<Character, "id" | "name" | "voice" | "persona" | "avatarPrompt">,
  speakerGender?: SpeakerProfile["gender"],
  genderSeed?: string,
): CharacterGender {
  return resolveCharacterGender(
    {
      mode: "roleplay",
      voice: character.voice,
      id: character.id,
      persona: character.persona,
      imagePrompt: character.avatarPrompt,
      characterName: character.name,
    },
    speakerGender,
    genderSeed ?? character.id,
  )
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
