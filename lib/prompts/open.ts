import { formatHistory } from "@/lib/prompts/coach"
import { agentCoachingBlock } from "@/lib/prompts/personality"
import type { PromptContext } from "@/lib/prompts"

export function buildOpenPrompt(ctx: PromptContext) {
  const { scenario, history } = ctx

  return `${scenario.persona}

${agentCoachingBlock({ deliveryStyle: scenario.deliveryStyle, coachingStyle: scenario.coachingStyle ?? "" })}

Conversation so far:
${formatHistory(history)}

Listen to the latest user audio turn. Transcribe what they said. Respond as ${scenario.title} — under 3 sentences, one gentle question.

This is an open conversation with no completion target. Do NOT score pronunciation. Set overall_score to 0, meter to 0, goal_achieved to false, words to [].

Provide exactly 3 next_sentences as reflective prompts with situational hints (no quotes).`
}
