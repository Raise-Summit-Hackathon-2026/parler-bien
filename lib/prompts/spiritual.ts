import type { VoiceAgent } from "@/lib/agents"
import type { ConversationTurn } from "@/lib/types"

import { formatHistory } from "@/lib/prompts/language"
import { agentCoachingBlock } from "@/lib/prompts/personality"

export function buildSpiritualPrompt(
  agent: VoiceAgent,
  history: ConversationTurn[],
  personaOverlay?: string,
) {
  const overlay = personaOverlay ? `\n\n${personaOverlay}` : ""

  return `${agent.personaBase}${overlay}

${agentCoachingBlock(agent)}

Conversation so far:
${formatHistory(history)}

Listen to the latest user audio turn. Transcribe what they said. Respond as ${agent.name} — under 3 sentences, one gentle question.

Do NOT score pronunciation. Set overall_score to 0, meter to 0, goal_achieved to false, words to [].

Provide exactly 3 next_sentences as reflective prompts with situational hints (no quotes).`
}
