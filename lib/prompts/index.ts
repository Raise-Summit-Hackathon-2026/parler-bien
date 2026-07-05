import type { Region } from "@/lib/languages"
import type { Scenario } from "@/lib/character"
import type { ConversationTurn } from "@/lib/types"

import { categoryScoresPronunciation } from "@/lib/character"

import { buildCoachPrompt } from "@/lib/prompts/coach"
import { buildOpenPrompt } from "@/lib/prompts/open"
import { buildRoleplayPrompt } from "@/lib/prompts/roleplay"
import { buildSkillRoleplayPrompt } from "@/lib/prompts/skill-roleplay"

export type PromptContext = {
  scenario: Scenario
  characterGender: "male" | "female"
  history: ConversationTurn[]
  currentMeter: number
  phrase?: string
  languageName: string
  region: Region
}

export function buildCharacterPrompt(ctx: PromptContext): string {
  switch (ctx.scenario.mode ?? "roleplay") {
    case "coach":
      return buildCoachPrompt(ctx)
    case "open":
      return buildOpenPrompt(ctx)
    default:
      return categoryScoresPronunciation(ctx.scenario.category)
        ? buildRoleplayPrompt(ctx)
        : buildSkillRoleplayPrompt(ctx)
  }
}
