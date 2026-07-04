import { GLAF_TEMPLATE } from "@/lib/glaf-template"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function seedGaleriesLafayetteTemplate(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const slug = `galeries-lafayette-${Date.now().toString(36)}`

  const { data: workspace, error: workspaceError } = await supabase
    .from("user_workspaces")
    .insert({
      owner_id: userId,
      name: GLAF_TEMPLATE.workspace.name,
      slug,
      description: GLAF_TEMPLATE.workspace.description,
      company_name: GLAF_TEMPLATE.workspace.company_name,
      visibility: GLAF_TEMPLATE.workspace.visibility,
    })
    .select()
    .single()

  if (workspaceError) throw workspaceError

  const workspaceId = workspace.id as string
  const personaIds: Record<string, string> = {}

  for (const [key, persona] of Object.entries(GLAF_TEMPLATE.personas)) {
    const { data: row, error } = await supabase
      .from("workspace_personas")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        name: persona.name,
        role_title: persona.role_title,
        tagline: persona.tagline,
        agent_type: persona.agent_type,
        capabilities: persona.capabilities,
        voice_age_range: persona.voice_age_range,
        voice_gender: persona.voice_gender,
        voice_tone: persona.voice_tone,
        delivery_style: persona.delivery_style,
        coaching_style: persona.coaching_style,
        skills: persona.skills,
        preview_script: persona.preview_script,
        persona_base: persona.persona_base,
        avatar_prompt: persona.avatar_prompt,
        greeting: persona.greeting,
        theme_color: persona.theme_color,
        instructions: persona.instructions,
      })
      .select("id")
      .single()

    if (error) throw error
    personaIds[key] = row.id as string
  }

  const firstPersonaId = personaIds.chloe
  if (firstPersonaId) {
    await supabase.from("persona_context_items").insert({
      workspace_id: workspaceId,
      persona_id: firstPersonaId,
      created_by: userId,
      kind: "text",
      title: "Brand guidelines",
      body_text: GLAF_TEMPLATE.contextGuidelines,
      source_name: "galeries-lafayette-guidelines.txt",
    })
  }

  for (const track of GLAF_TEMPLATE.tracks) {
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
