import type { Region } from "@/lib/languages"
import type { Scenario } from "@/lib/scenarios"
import type { ConversationTurn } from "@/lib/types"

import { buildCoachPrompt } from "@/lib/prompts/coach"
import { buildOpenPrompt } from "@/lib/prompts/open"
import { buildRoleplayPrompt } from "@/lib/prompts/roleplay"

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
      return buildRoleplayPrompt(ctx)
  }
}
