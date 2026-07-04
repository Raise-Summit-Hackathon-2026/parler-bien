import type { AgentType, VoiceAgent } from "@/lib/agents"
import type { Region } from "@/lib/languages"
import type { Scenario } from "@/lib/scenarios"
import type { ConversationTurn } from "@/lib/types"
import type { LevelRoom } from "@/lib/tracks"

import { buildLanguagePrompt } from "@/lib/prompts/language"
import { buildRoleplayPrompt } from "@/lib/prompts/roleplay"
import { buildSpiritualPrompt } from "@/lib/prompts/spiritual"

export type PromptContext = {
  agentType: AgentType
  agent: VoiceAgent
  scenario: Scenario
  characterGender: "male" | "female"
  history: ConversationTurn[]
  currentMeter: number
  phrase?: string
  languageName: string
  region: Region
  levelRoom?: LevelRoom
}

export function buildAgentPrompt(ctx: PromptContext): string {
  const overlay = ctx.levelRoom?.customPersonaOverlay

  switch (ctx.agentType) {
    case "language":
      return buildLanguagePrompt(
        ctx.phrase,
        ctx.languageName,
        ctx.region,
        ctx.agent.personaBase + (overlay ? `\n\n${overlay}` : ""),
        ctx.agent,
      )
    case "roleplay":
      return buildRoleplayPrompt(
        ctx.scenario,
        ctx.characterGender,
        ctx.history,
        ctx.currentMeter,
        ctx.phrase,
        ctx.languageName,
        ctx.region,
        overlay,
        ctx.agent,
      )
    case "spiritual":
      return buildSpiritualPrompt(ctx.agent, ctx.history, overlay)
  }
}
