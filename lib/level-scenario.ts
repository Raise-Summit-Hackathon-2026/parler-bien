import type { VoiceAgent } from "@/lib/agents"
import type { LanguageId } from "@/lib/languages"
import { getScenario, type Scenario, type ScenarioId } from "@/lib/scenarios"
import type { PassCriteria, TrackLevel } from "@/lib/tracks"

export type LevelContext = {
  trackId: string
  levelId: string
  level: TrackLevel
  agent: VoiceAgent
  passCriteria: PassCriteria
  onLevelComplete: () => void
}

export function buildLevelScenario(
  level: TrackLevel,
  agent: VoiceAgent,
  languageId: LanguageId,
): Scenario {
  const room = level.room

  if (room.scenarioId) {
    const base = getScenario(room.scenarioId as Parameters<typeof getScenario>[0])
    return {
      ...base,
      title: level.title,
      tagline: level.subtitle,
      goal: room.goal ?? base.goal,
      meterLabel: room.meterLabel ?? base.meterLabel,
      winMessage: room.winMessage ?? base.winMessage,
      persona: agent.personaBase + (room.customPersonaOverlay ? `\n\n${room.customPersonaOverlay}` : `\n\n${base.persona}`),
      voice: agent.voice,
    }
  }

  const content = room.openingLine || room.starters
    ? {
        [languageId]: {
          openingLine: room.openingLine ?? null,
          starters: room.starters ?? [],
        },
      }
    : {}

  const scenarioId: ScenarioId = `custom:${level.id}`

  return {
    id: scenarioId,
    title: level.title,
    tagline: level.subtitle,
    goal: room.goal ?? null,
    meterLabel: room.meterLabel ?? null,
    winMessage: room.winMessage ?? "Level complete!",
    persona: agent.personaBase + (room.customPersonaOverlay ? `\n\n${room.customPersonaOverlay}` : ""),
    voice: agent.voice,
    content,
    imagePrompt: agent.avatarPrompt,
    primaryLanguageId: languageId,
  }
}

export function isLevelScenarioId(
  scenarioId: ScenarioId,
  levelId: string,
): boolean {
  return scenarioId === `custom:${levelId}`
}
