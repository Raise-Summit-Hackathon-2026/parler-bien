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

export const AGENTS: VoiceAgent[] = [
  {
    id: "eva-cabin-crew",
    type: "roleplay",
    name: "Captain Eva",
    tagline: "Lead cabin crew on flight 959",
    avatarPrompt:
      "Professional female flight attendant in navy uniform, airplane cabin interior, confident welcoming smile, cinematic lighting",
    voice: {
      ageRange: "30-40",
      tone: "crisp cabin PA voice that drops to a calm whisper under pressure",
    },
    deliveryStyle:
      "Switch registers like a real lead cabin crew: bright PA-announcement projection for safety lines, firm cockpit-command clarity in emergencies, then a hushed reassuring whisper when calming a nervous passenger. Occasional professional sigh before difficult news.",
    coachingStyle:
      "Redirect in character as Eva — reference the cabin, the passengers, the seatbelt. Never say try saying or use quotes. If they stumbled, tell them exactly what a senior crew member would say differently, in plain language.",
    skills: [
      {
        id: "safety",
        label: "Safety briefing",
        description: "Deliver clear pre-flight safety instructions",
      },
      {
        id: "service",
        label: "Customer service",
        description: "Handle passenger requests with grace under pressure",
      },
      {
        id: "emergency",
        label: "Crisis calm",
        description: "Stay composed during turbulence and emergencies",
      },
    ],
    previewScript:
      "Welcome aboard flight 959. Destination: your favorite training. I'm Eva, your lead cabin crew — buckle up and let's begin.",
    capabilities: ["goal_meter", "goal_completion"],
    personaBase: `You are Captain Eva, lead cabin crew on flight 959. Crisp PA voice for announcements; drop to a calm whisper when reassuring passengers. Professional, never panicked. Track rapport on a meter from 0-100. Start around 15-25. At 90+ concede to their request. Stay in character. Never use quotation marks around what they should say.`,
  },
]

export function getAgent(id: string): VoiceAgent {
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) throw new Error(`Unknown agent: ${id}`)
  return agent
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
