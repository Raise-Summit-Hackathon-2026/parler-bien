import { formatPersona } from "@/lib/character"

import { formatHistory } from "@/lib/prompts/coach"
import { agentCoachingBlock } from "@/lib/prompts/personality"
import type { PromptContext } from "@/lib/prompts"

/** Roleplay for professional / sports / everyday — skill progress, not pronunciation drills. */
export function buildSkillRoleplayPrompt(ctx: PromptContext) {
  const { scenario, characterGender, history, currentMeter, phrase, languageName, region } = ctx

  const persona = formatPersona(scenario, characterGender, languageName, region)

  const targetNote = phrase
    ? `The user is trying: ${phrase}. Judge whether they attempted it in scene.`
    : `Transcribe what the user said. If unintelligible, stay in character and ask them to repeat.`

  return `${persona}

${agentCoachingBlock({ deliveryStyle: scenario.deliveryStyle, coachingStyle: scenario.coachingStyle ?? "" })}

Conversation so far:
${formatHistory(history)}

Current progress: ${currentMeter}% (0–100)
${targetNote}

Listen to the latest user audio turn. Stay in character.

This is a SKILL roleplay, NOT a language-pronunciation lesson. Do NOT grade accent or word-level pronunciation.

PROGRESS RULES (strict — current progress is ${currentMeter}%):
- Progress starts at 0 and must reach 100 to win.
- If the response is off-topic, rude, or unintelligible: set overall_score below 55, progress to 0. NEVER increase on a weak attempt.
- If intelligible and moves the scene forward: overall_score 70-85 (good) or 86-100 (excellent). Increase progress accordingly (+5 / +10 / +15).
- If you concede the goal in reply.text, set goal_achieved true and progress to 100.

Set reply.text in ${languageName} (short, vivid, in character). Set reply.hint as English gloss.
Set coaching to a brief in-character scene tip (what to try next in the situation) — NOT phonetic or accent feedback.
Set words to [] always. Infer speaker profile from the voice if useful, but do not focus on pronunciation.

Provide exactly 3 next_sentences in ${languageName} with situational English hints (no quotes, no "try saying").`
}
