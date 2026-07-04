import { formatPersona } from "@/lib/character"

import { formatHistory } from "@/lib/prompts/coach"
import { agentCoachingBlock } from "@/lib/prompts/personality"
import type { PromptContext } from "@/lib/prompts"

export function buildRoleplayPrompt(ctx: PromptContext) {
  const { scenario, characterGender, history, currentMeter, phrase, languageName, region } = ctx

  const persona = formatPersona(scenario, characterGender, languageName, region)

  const targetNote = phrase
    ? `The user is practicing: ${phrase}. Score against this if they attempted it.`
    : `Transcribe what the user said in ${languageName}. If unintelligible, return low scores and stay in character asking them to repeat.`

  return `${persona}

${agentCoachingBlock({ deliveryStyle: scenario.deliveryStyle, coachingStyle: scenario.coachingStyle ?? "" })}

Conversation so far:
${formatHistory(history)}

Current meter: ${currentMeter}
${targetNote}

Listen to the latest user audio turn. Stay in character.

METER RULES (strict — current meter is ${currentMeter}):
- If overall_score < 55 OR the response is off-topic, rude, or unintelligible: set meter to ${currentMeter} or lower. NEVER increase on a weak attempt.
- Only increase when the user made a clear, intelligible attempt that genuinely moves the scene forward.
- Strong attempt (score 65+): increase up to 12 points. Excellent (80+): up to 18. Weak but intelligible: up to 6.
- If you concede the goal in reply.text, set goal_achieved true and meter to at least 95.

Set reply.text in ${languageName} (short, vivid, in character). Set reply.hint as English gloss.

Also score pronunciation: overall_score, words from transcript, coaching (in-character recommendation), speaker profile.

Provide exactly 3 next_sentences in ${languageName} with situational English hints (no quotes, no "try saying").`
}
