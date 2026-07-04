export type AgentType = "language" | "roleplay" | "spiritual"

export type AgentCapability =
  | "pronunciation_score"
  | "word_breakdown"
  | "goal_meter"
  | "goal_completion"
  | "reflection_prompt"

export type AgentSkill = {
  id: string
  label: string
  description: string
}

export type VoiceAgent = {
  id: string
  type: AgentType
  name: string
  tagline: string
  avatarPrompt: string
  /** LiveAvatar public avatar UUID for real-time video */
  liveAvatarId?: string
  /** Optional LiveAvatar voice override */
  liveAvatarVoiceId?: string
  voice: { ageRange: string; tone: string }
  deliveryStyle: string
  coachingStyle: string
  skills: AgentSkill[]
  previewScript: string
  capabilities: AgentCapability[]
  personaBase: string
}

export function getAgentTypeLabel(type: AgentType): string {
  switch (type) {
    case "language":
      return "Language"
    case "roleplay":
      return "Roleplay"
    case "spiritual":
      return "Spiritual"
  }
}

export function hasCapability(
  agent: VoiceAgent,
  capability: AgentCapability,
): boolean {
  return agent.capabilities.includes(capability)
}

export const AGENT_CAPABILITY_OPTIONS: {
  id: AgentCapability
  label: string
  forTypes: AgentType[]
}[] = [
  {
    id: "pronunciation_score",
    label: "Pronunciation scoring",
    forTypes: ["language"],
  },
  {
    id: "word_breakdown",
    label: "Word breakdown",
    forTypes: ["language"],
  },
  { id: "goal_meter", label: "Goal meter", forTypes: ["roleplay"] },
  {
    id: "goal_completion",
    label: "Goal completion",
    forTypes: ["roleplay"],
  },
  {
    id: "reflection_prompt",
    label: "Reflection prompts",
    forTypes: ["spiritual"],
  },
]
