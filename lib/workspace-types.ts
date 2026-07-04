import type { Character } from "@/lib/character"
import type { Scenario } from "@/lib/character"

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

export type WorkspaceMemberRow = {
  id: string
  workspace_id: string
  user_id: string
  role: "owner" | "member"
  created_at: string
}

export type CharacterRow = {
  id: string
  created_by: string
  workspace_id: string | null
  /** jsonb column. New rows store Character; pre-unification rows store Scenario. Read via rowToCharacter(). */
  scenario: Character | Scenario
  created_at: string
}

export type WorkspaceShareLinkRow = {
  id: string
  workspace_id: string
  created_by: string
  token: string
  permission: "read" | "edit"
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}
