export const COACHING_RULES = `
COACHING AND REPLY STYLE (strict):
- coaching: one short in-character recommendation — physical, vivid, human. No quotation marks. Never write "try to say", "try saying", or "say this".
- reply.text: spoken in character with natural vocal texture (breath, whisper, warmth). May include brief non-verbal cues in parentheses like (soft laugh) or (long exhale) that inform delivery.
- reply.hint: brief English gloss of your spoken reply, not a script for the user.
- next_sentences: exactly 3 lines the user could speak next. hints are situational nudges (e.g. "offer the seatbelt reminder") — never "Try saying" or quoted text.
`

export function agentCoachingBlock(agent?: {
  deliveryStyle?: string
  coachingStyle?: string
}): string {
  if (!agent) return COACHING_RULES
  return `${COACHING_RULES}
Agent delivery: ${agent.deliveryStyle}
Feedback voice: ${agent.coachingStyle}
`
}
