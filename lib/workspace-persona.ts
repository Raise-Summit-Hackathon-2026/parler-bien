import type { VoiceAgent } from "@/lib/agents"
import type { WorkspacePersonaRow } from "@/lib/workspace-types"

export function personaToVoiceAgent(persona: WorkspacePersonaRow): VoiceAgent {
  const personaBase =
    persona.persona_base?.trim() ||
    persona.instructions?.trim() ||
    `You are ${persona.name}. Stay in character.`

  return {
    id: persona.id,
    type: persona.agent_type,
    name: persona.name,
    tagline: persona.tagline ?? persona.role_title ?? "Workspace persona",
    avatarPrompt:
      persona.avatar_prompt ??
      "Professional portrait, warm cinematic illustration, no text",
    voice: {
      ageRange: persona.voice_age_range ?? "30-40",
      tone: persona.voice_tone ?? "Natural and helpful",
    },
    deliveryStyle: persona.delivery_style ?? "Natural conversational delivery.",
    coachingStyle:
      persona.coaching_style ??
      "Give vivid, in-character feedback. Never use quotation marks around suggested phrases.",
    skills: persona.skills ?? [],
    previewScript:
      persona.preview_script ??
      persona.greeting ??
      `Hello, I'm ${persona.name}. Let's practice together.`,
    capabilities: persona.capabilities ?? [],
    personaBase,
  }
}
