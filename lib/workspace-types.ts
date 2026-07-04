import type { AgentCapability, AgentSkill, AgentType } from "@/lib/agents"
import type { GestureStep } from "@/lib/gestures"
import type { LanguageId, RegionId } from "@/lib/languages"
import type { ScenarioId } from "@/lib/scenarios"
import type { SentenceSuggestion } from "@/lib/types"

export type PassCriteria =
  | { type: "pronunciation"; minScore: number }
  | { type: "goal"; minMeter?: number }
  | { type: "complete"; minTurns: number }
  | { type: "gesture"; steps: GestureStep[]; holdMs?: number }

export type LevelRoom = {
  scenarioId?: ScenarioId
  customPersonaOverlay?: string
  targetPhrase?: string
  openingLine?: SentenceSuggestion
  goal?: string | null
  meterLabel?: string | null
  winMessage?: string | null
  starters?: SentenceSuggestion[]
}

export type LevelStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "draft"

export type WorkspaceRow = {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  company_name: string | null
  purpose: string
  visibility: "private" | "shared"
  created_at: string
}

export type WorkspacePersonaRow = {
  id: string
  workspace_id: string
  created_by: string
  name: string
  role_title: string | null
  voice_tone: string | null
  instructions: string
  greeting: string | null
  avatar_prompt: string | null
  tagline: string | null
  agent_type: AgentType
  capabilities: AgentCapability[]
  voice_age_range: string | null
  voice_gender: "male" | "female" | "random" | "opposite-speaker" | null
  voice_map: Record<string, string>
  delivery_style: string | null
  coaching_style: string | null
  skills: AgentSkill[]
  preview_script: string | null
  persona_base: string | null
  theme_color: string | null
  created_at: string
}

export type WorkspaceTrackRow = {
  id: string
  workspace_id: string
  persona_id: string
  title: string
  description: string | null
  theme_color: string
  estimated_minutes: number
  position: number
  created_at: string
}

export type WorkspaceLevelRow = {
  id: string
  track_id: string
  position: number
  title: string
  subtitle: string
  status: "playable" | "draft"
  pass_criteria: PassCriteria
  room: LevelRoom
  language_id: LanguageId | null
  region_id: RegionId | null
  created_at: string
}

export type WorkspaceLevelProgressRow = {
  id: string
  user_id: string
  level_id: string
  status: "available" | "in_progress" | "completed"
  best_score: number | null
  attempts: number
  completed_at: string | null
}

export type WorkspaceTrackWithLevels = WorkspaceTrackRow & {
  levels: WorkspaceLevelRow[]
  persona?: WorkspacePersonaRow
}

export function isGestureLevel(level: WorkspaceLevelRow): boolean {
  return level.pass_criteria.type === "gesture"
}

export function getPlayableLevels(levels: WorkspaceLevelRow[]): WorkspaceLevelRow[] {
  return levels.filter((l) => l.status === "playable")
}

export function countPlayableLevels(levels: WorkspaceLevelRow[]): number {
  return getPlayableLevels(levels).length
}
