import type { AgentCapability, AgentSkill, AgentType } from "@/lib/agents"
import type { LevelRoom, PassCriteria } from "@/lib/workspace-types"

export type TemplatePersona = {
  name: string
  role_title: string
  tagline: string
  agent_type: AgentType
  capabilities: AgentCapability[]
  voice_age_range: string
  voice_gender: "male" | "female" | "random" | "opposite-speaker"
  voice_tone: string
  delivery_style: string
  coaching_style: string
  skills: AgentSkill[]
  preview_script: string
  persona_base: string
  avatar_prompt: string
  greeting: string
  theme_color: string
  instructions: string
  live_avatar_id?: string
}

export type TemplateLevel = {
  position: number
  title: string
  subtitle: string
  status: "playable" | "draft"
  pass_criteria: PassCriteria
  room: LevelRoom
  language_id?: string
  region_id?: string
}

export type TemplateTrack = {
  title: string
  description: string
  theme_color: string
  estimated_minutes: number
  position: number
  personaKey: string
  levels: TemplateLevel[]
}

export type WorkspaceTemplateInput = {
  workspace: {
    name: string
    description: string
    company_name: string
    visibility?: "private" | "shared"
  }
  contextSummary?: string
  personas: Array<{ key: string } & TemplatePersona>
  tracks: TemplateTrack[]
}
