import type { AgentType, VoiceAgent } from "@/lib/agents"
import type { Region } from "@/lib/languages"
import type { Scenario } from "@/lib/scenarios"
import type { ConversationTurn } from "@/lib/types"

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
}

export function buildAgentPrompt(ctx: PromptContext): string {
  switch (ctx.agentType) {
    case "language":
      return buildLanguagePrompt(
        ctx.phrase,
        ctx.languageName,
        ctx.region,
        ctx.agent.personaBase,
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
        undefined,
        ctx.agent,
      )
    case "spiritual":
      return buildSpiritualPrompt(ctx.agent, ctx.history)
  }
}
