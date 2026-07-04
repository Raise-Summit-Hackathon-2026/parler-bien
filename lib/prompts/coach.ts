import type { ConversationTurn } from "@/lib/types"

import { agentCoachingBlock } from "@/lib/prompts/personality"
import type { PromptContext } from "@/lib/prompts"

export function formatHistory(history: ConversationTurn[]) {
  if (history.length === 0) return "No prior conversation."

  return history
    .map((turn) => `${turn.role === "user" ? "User" : "Character"}: ${turn.text}`)
    .join("\n")
}

export function buildCoachPrompt(ctx: PromptContext) {
  const { scenario, phrase, languageName, region } = ctx

  const modeInstructions = phrase
    ? `Target phrase: "${phrase}"
Score their pronunciation against this target phrase. Set transcript to the target phrase.`
    : `No target phrase was given. Transcribe what the user said in ${languageName}, then score their pronunciation against native ${region.accent} pronunciation. Set transcript to what you heard. If you cannot detect intelligible ${languageName}, return a low overall_score with coaching "I couldn't quite catch that — try speaking clearly and closer to the mic."`

  const replyLanguage =
    languageName === "English"
      ? `${languageName} with a ${region.accent} accent`
      : `${languageName} or simple ${languageName} with brief English gloss in reply.hint`

  const persona = scenario.persona ? `${scenario.persona}\n\n` : ""

  return `${persona}You are a pronunciation coach. The user is practicing speaking ${languageName} with a ${region.accent} accent. The setting is ${region.city}.

${agentCoachingBlock({ deliveryStyle: scenario.deliveryStyle, coachingStyle: scenario.coachingStyle ?? "" })}

${modeInstructions}

Listen to their recording and score their pronunciation against native ${region.accent}. Be slightly generous but accurate. Ignore background noise.

Also infer speaker metadata from the voice: accent (native/source language influencing their ${languageName}), age_range (rough estimate like "20-30"), gender (male | female | unsure), and notes (one short sentence on how this profile affects their ${languageName}). Use this profile to tailor coaching, per-word tips, and reply to accent-specific pitfalls. Keep estimates non-judgmental.

The coach character speaking in reply is the OPPOSITE gender of the speaker (male speaker → female coach, female speaker → male coach, unsure → female coach). Write reply.text as spoken feedback (2-3 sentences max) in ${replyLanguage} with natural vocal texture. Not flirtatious.

Set meter to 0 and goal_achieved to false.

Split the transcript into individual words. Score each word from 0-100. Use null for issue and tip when a word scores 80 or above.

Provide exactly 3 next_sentences in ${languageName}. hints are situational nudges only — no quotes, no "try saying".`
}
