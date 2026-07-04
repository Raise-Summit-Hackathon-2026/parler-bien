import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Character } from "@/lib/character"
import type {
  CharacterRow,
  WorkspaceMemberRow,
  WorkspaceRow,
} from "@/lib/workspace-types"

export async function listPersonalCharacters(): Promise<CharacterRow[]> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("created_by", user.id)
    .is("workspace_id", null)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as CharacterRow[]
}

export async function listWorkspaceCharacters(
  workspaceId: string,
): Promise<CharacterRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as CharacterRow[]
}

export async function getCharacter(id: string): Promise<CharacterRow | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return (data as CharacterRow | null) ?? null
}

export async function saveCharacter(
  character: Character,
  workspaceId?: string,
): Promise<CharacterRow> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Sign in required")

  const { data, error } = await supabase
    .from("characters")
    .insert({
      created_by: user.id,
      workspace_id: workspaceId ?? null,
      scenario: character,
    })
    .select("*")
    .single()

  if (error) throw error
  return data as CharacterRow
}

export async function deleteCharacter(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase.from("characters").delete().eq("id", id)
  if (error) throw error
}

export async function joinWorkspaceViaToken(token: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc("join_workspace_via_token", {
    p_token: token,
  })

  if (error) throw error
  return data as string
}

export async function listMemberWorkspaces(): Promise<
  Array<WorkspaceRow & { role: WorkspaceMemberRow["role"] }>
> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: memberships, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)

  if (memberError) throw memberError
  if (!memberships?.length) return []

  const workspaceIds = memberships.map((m) => m.workspace_id)
  const { data: workspaces, error: wsError } = await supabase
    .from("user_workspaces")
    .select("*")
    .in("id", workspaceIds)
    .order("created_at", { ascending: false })

  if (wsError) throw wsError

  const roleByWorkspace = new Map(
    memberships.map((m) => [m.workspace_id, m.role as WorkspaceMemberRow["role"]]),
  )

  return ((workspaces ?? []) as WorkspaceRow[]).map((workspace) => ({
    ...workspace,
    role: roleByWorkspace.get(workspace.id) ?? "member",
  }))
}

export async function createShareLink(workspaceId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Sign in required")

  const { data, error } = await supabase
    .from("workspace_share_links")
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      permission: "read",
    })
    .select("token")
    .single()

  if (error) throw error
  return (data as { token: string }).token
}

export async function getActiveShareLink(
  workspaceId: string,
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("workspace_share_links")
    .select("token")
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as { token: string } | null)?.token ?? null
}

export async function getWorkspace(
  workspaceId: string,
): Promise<WorkspaceRow | null> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("user_workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle()

  if (error) throw error
  return (data as WorkspaceRow | null) ?? null
}
