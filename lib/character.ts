import type { GestureStep } from "@/lib/gestures"
import type { LanguageId } from "@/lib/languages"
import type { Scenario, ScenarioContent } from "@/lib/scenarios"

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
