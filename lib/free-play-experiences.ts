import type { VoiceAgent } from "@/lib/agents"
import { getAgent } from "@/lib/agents"
import { CABIN_SAFETY_GESTURES, type GestureStep } from "@/lib/gestures"
import type { LanguageId } from "@/lib/languages"
import type { Scenario, ScenarioId } from "@/lib/scenarios"
import type { SentenceSuggestion } from "@/lib/types"

export type FreePlayExperienceId = "cabin-crew"

export type ExperiencePassCriteria = "goal"

export type ExperienceVoiceLevel = {
  type: "voice"
  id: string
  title: string
  subtitle: string
  openingLine: SentenceSuggestion
  starters?: SentenceSuggestion[]
  customPersonaOverlay: string
  goal: string
  meterLabel: string
  winMessage: string
  passCriteria: ExperiencePassCriteria
}

export type ExperienceGestureLevel = {
  type: "gesture"
  id: string
  title: string
  subtitle: string
  steps: GestureStep[]
  gestureTitle: string
  winMessage: string
  holdMs?: number
}

export type ExperienceLevel = ExperienceVoiceLevel | ExperienceGestureLevel

export type FreePlayExperience = {
  id: FreePlayExperienceId
  title: string
  tagline: string
  styleLabel: string
  themeColor: string
  agentId: string
  imagePrompt: string
  levels: ExperienceLevel[]
}

export const FREE_PLAY_EXPERIENCES: FreePlayExperience[] = [
  {
    id: "cabin-crew",
    title: "Flight Attendant",
    tagline: "Welcome guests, safety gestures on camera, then calm 23B in a whisper",
    styleLabel: "Roleplay · Camera",
    themeColor: "#8b5cf6",
    agentId: "eva-cabin-crew",
    imagePrompt:
      "Professional female flight attendant in navy uniform, airplane cabin interior, confident welcoming smile, cinematic lighting",
    levels: [
      {
        type: "voice",
        id: "cabin-l1-welcome",
        title: "Welcome guests",
        subtitle: "Boarding flight 959 — greet passengers at the door",
        openingLine: {
          text: "Boarding is almost complete on flight 959. A couple at 12A just stepped on — they're scanning for seats, looking a little lost. How do you welcome them?",
          hint: "Warm, professional greeting",
        },
        goal: "Make guests feel welcome and oriented",
        meterLabel: "Guest welcome",
        customPersonaOverlay: `SCENARIO: Pre-flight boarding on flight 959. Passengers are finding their seats. You are at the cabin door or in the aisle. Goal: warm professional welcome — greet by name if possible, mention the flight, offer help with luggage or seat direction. Bright PA-friendly tone is fine here.`,
        starters: [
          {
            text: "Good morning! Welcome aboard flight 959. Can I help you find your seats?",
            hint: "Warm door greeting",
          },
          {
            text: "Welcome! You're in 12A and 12B — just down the aisle on your left.",
            hint: "Direct and helpful",
          },
          {
            text: "Lovely to have you with us today. Let me know if you need anything stowed.",
            hint: "Personable service tone",
          },
        ],
        winMessage: "Perfect welcome — they're relaxed and settled in.",
        passCriteria: "goal",
      },
      {
        type: "gesture",
        id: "cabin-l2-safety",
        title: "Safety demo",
        subtitle: "Learn the signs, then perform on camera",
        steps: CABIN_SAFETY_GESTURES,
        gestureTitle: "Safety demonstration",
        winMessage:
          "Perfect safety demonstration! Passengers are briefed and ready.",
        holdMs: 1400,
      },
      {
        type: "voice",
        id: "cabin-l3-nervous",
        title: "Calm seat 23B",
        subtitle: "Reassure a nervous guest without waking the cabin",
        openingLine: {
          text: "We're in light turbulence. The guest in 23B is gripping the armrest — white-knuckled. The cabin around them is quiet. Help them calm down, but keep your voice low.",
          hint: "Hushed, intimate reassurance",
        },
        goal: "Calm the nervous passenger in 23B",
        meterLabel: "Passenger calm",
        customPersonaOverlay: `SCENARIO: Moderate turbulence. Nervous passenger in seat 23B. CRITICAL: The user must speak in a hushed whisper — close to the passenger, under their breath. If they speak loudly, shout, or use PA-announcement voice, neighbors stir and the meter drops sharply. Reward quiet, calm, intimate reassurance. Goal: get them to breathe, fasten seatbelt, and stay seated without disturbing other passengers.`,
        starters: [
          {
            text: "Sir... it's alright. Just a little bumpiness. I'm right here with you.",
            hint: "Soft whisper at the seat",
          },
          {
            text: "We're through the worst of it. Could you buckle up for me? Nice and easy.",
            hint: "Quiet, steady tone",
          },
          {
            text: "Take a slow breath with me. The pilots have everything under control.",
            hint: "Intimate calming voice",
          },
        ],
        winMessage: "Well handled — 23B is calm, and the cabin stayed peaceful.",
        passCriteria: "goal",
      },
    ],
  },
]

export function isFreePlayExperienceId(
  value: string,
): value is FreePlayExperienceId {
  return FREE_PLAY_EXPERIENCES.some((item) => item.id === value)
}

export function getFreePlayExperience(
  id: FreePlayExperienceId,
): FreePlayExperience {
  const experience = FREE_PLAY_EXPERIENCES.find((item) => item.id === id)
  if (!experience) throw new Error(`Unknown experience: ${id}`)
  return experience
}

export function getExperienceAgent(experience: FreePlayExperience): VoiceAgent {
  return getAgent(experience.agentId)
}

export function buildExperienceLevelScenario(
  experience: FreePlayExperience,
  level: ExperienceVoiceLevel,
  agent: VoiceAgent,
  languageId: LanguageId,
): Scenario {
  const scenarioId: ScenarioId = `custom:experience-${experience.id}-${level.id}`

  return {
    id: scenarioId,
    title: level.title,
    tagline: level.subtitle,
    goal: level.goal,
    meterLabel: level.meterLabel,
    winMessage: level.winMessage,
    persona: `${agent.personaBase}\n\n${level.customPersonaOverlay}`,
    voice: agent.voice,
    content: {
      [languageId]: {
        openingLine: level.openingLine,
        starters: level.starters ?? [],
      },
    },
    imagePrompt: agent.avatarPrompt,
    primaryLanguageId: languageId,
  }
}

export function experienceLevelRoom(level: ExperienceVoiceLevel) {
  return { customPersonaOverlay: level.customPersonaOverlay }
}

export function nextExperienceLevelLabel(
  experience: FreePlayExperience,
  levelIndex: number,
): string | null {
  const next = experience.levels[levelIndex + 1]
  if (!next) return null
  return next.type === "gesture" ? next.gestureTitle : next.title
}
