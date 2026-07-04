import { GLAF_TEMPLATE } from "@/lib/glaf-template"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { WorkspaceTemplateInput } from "@/lib/workspace-template"

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return slug || `workspace-${Date.now()}`
}

export async function createWorkspaceFromTemplate(
  supabase: SupabaseClient,
  userId: string,
  template: WorkspaceTemplateInput,
): Promise<string> {
  const slug = `${slugify(template.workspace.name)}-${Date.now().toString(36)}`

  const { data: workspace, error: workspaceError } = await supabase
    .from("user_workspaces")
    .insert({
      owner_id: userId,
      name: template.workspace.name,
      slug,
      description: template.workspace.description,
      company_name: template.workspace.company_name,
      visibility: template.workspace.visibility ?? "private",
    })
    .select()
    .single()

  if (workspaceError) throw workspaceError

  const workspaceId = workspace.id as string
  const personaIds: Record<string, string> = {}

  for (const persona of template.personas) {
    const { key, ...fields } = persona
    const { data: row, error } = await supabase
      .from("workspace_personas")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        name: fields.name,
        role_title: fields.role_title,
        tagline: fields.tagline,
        agent_type: fields.agent_type,
        capabilities: fields.capabilities,
        voice_age_range: fields.voice_age_range,
        voice_gender: fields.voice_gender,
        voice_tone: fields.voice_tone,
        delivery_style: fields.delivery_style,
        coaching_style: fields.coaching_style,
        skills: fields.skills,
        preview_script: fields.preview_script,
        persona_base: fields.persona_base,
        avatar_prompt: fields.avatar_prompt,
        greeting: fields.greeting,
        theme_color: fields.theme_color,
        instructions: fields.instructions,
      })
      .select("id")
      .single()

    if (error) throw error
    personaIds[key] = row.id as string
  }

  const contextSummary = template.contextSummary?.trim()
  if (contextSummary) {
    const firstPersonaId = template.personas[0]
      ? personaIds[template.personas[0].key]
      : undefined

    if (firstPersonaId) {
      await supabase.from("persona_context_items").insert({
        workspace_id: workspaceId,
        persona_id: firstPersonaId,
        created_by: userId,
        kind: "text",
        title: "Training guidelines",
        body_text: contextSummary,
        source_name: "generated-guidelines.txt",
      })
    }
  }

  for (const track of template.tracks) {
    const personaId = personaIds[track.personaKey]
    if (!personaId) continue

    const { data: trackRow, error: trackError } = await supabase
      .from("workspace_tracks")
      .insert({
        workspace_id: workspaceId,
        persona_id: personaId,
        title: track.title,
        description: track.description,
        theme_color: track.theme_color,
        estimated_minutes: track.estimated_minutes,
        position: track.position,
      })
      .select("id")
      .single()

    if (trackError) throw trackError

    const trackId = trackRow.id as string
    const levelRows = track.levels.map((level) => ({
      track_id: trackId,
      position: level.position,
      title: level.title,
      subtitle: level.subtitle,
      status: level.status,
      pass_criteria: level.pass_criteria,
      room: level.room,
      language_id: level.language_id ?? null,
      region_id: level.region_id ?? null,
    }))

    const { error: levelsError } = await supabase
      .from("workspace_levels")
      .insert(levelRows)

    if (levelsError) throw levelsError
  }

  return workspaceId
}

export async function seedGaleriesLafayetteTemplate(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const template: WorkspaceTemplateInput = {
    workspace: GLAF_TEMPLATE.workspace,
    contextSummary: GLAF_TEMPLATE.contextGuidelines,
    personas: Object.entries(GLAF_TEMPLATE.personas).map(([key, persona]) => ({
      key,
      ...persona,
    })),
    tracks: [...GLAF_TEMPLATE.tracks],
  }

  return createWorkspaceFromTemplate(supabase, userId, template)
}
