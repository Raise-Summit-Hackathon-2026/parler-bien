import type { LanguageId, RegionId } from "@/lib/languages"
import type { GeneratedWorkspacePayload } from "@/lib/workspace-generate-schema"
import type { PassCriteria } from "@/lib/workspace-types"
import type { WorkspaceTemplateInput } from "@/lib/workspace-template"

function buildPassCriteria(level: GeneratedWorkspacePayload["tracks"][number]["levels"][number]): PassCriteria {
  switch (level.passCriteriaType) {
    case "pronunciation":
      return { type: "pronunciation", minScore: level.minScore ?? 80 }
    case "complete":
      return { type: "complete", minTurns: level.minTurns ?? 4 }
    case "goal":
    default:
      return { type: "goal" }
  }
}

export function generatedPayloadToTemplate(
  payload: GeneratedWorkspacePayload,
  languageId: LanguageId,
  regionId: RegionId,
): WorkspaceTemplateInput {
  return {
    workspace: {
      name: payload.workspace.name.trim(),
      description: payload.workspace.description.trim(),
      company_name: payload.workspace.companyName.trim(),
      visibility: "private",
    },
    contextSummary: payload.contextSummary.trim(),
    personas: payload.personas.map((persona) => ({
      key: persona.key.trim(),
      name: persona.name.trim(),
      role_title: persona.roleTitle.trim(),
      tagline: persona.tagline.trim(),
      agent_type: persona.agentType,
      capabilities: persona.capabilities,
      voice_age_range: persona.voiceAgeRange.trim(),
      voice_gender: persona.voiceGender,
      voice_tone: persona.voiceTone.trim(),
      delivery_style: persona.deliveryStyle.trim(),
      coaching_style: persona.coachingStyle.trim(),
      skills: persona.skills.map((skill) => ({
        id: skill.id.trim(),
        label: skill.label.trim(),
        description: skill.description.trim(),
      })),
      preview_script: persona.previewScript.trim(),
      persona_base: persona.personaBase.trim(),
      avatar_prompt: persona.avatarPrompt.trim(),
      greeting: persona.greeting.trim(),
      theme_color: persona.themeColor.trim(),
      instructions: persona.coachingStyle.trim(),
    })),
    tracks: payload.tracks.map((track, index) => ({
      title: track.title.trim(),
      description: track.description.trim(),
      theme_color: track.themeColor.trim(),
      estimated_minutes: track.estimatedMinutes,
      position: index + 1,
      personaKey: track.personaKey.trim(),
      levels: track.levels.map((level) => ({
        position: level.position,
        title: level.title.trim(),
        subtitle: level.subtitle.trim(),
        status: "playable" as const,
        pass_criteria: buildPassCriteria(level),
        language_id: languageId,
        region_id: regionId,
        room: {
          targetPhrase: level.targetPhrase?.trim(),
          goal: level.goal?.trim() ?? null,
          meterLabel: level.meterLabel?.trim() ?? null,
          winMessage: level.winMessage.trim(),
          customPersonaOverlay: level.customPersonaOverlay?.trim(),
          openingLine:
            level.openingLineText && level.openingLineHint
              ? {
                  text: level.openingLineText.trim(),
                  hint: level.openingLineHint.trim(),
                }
              : undefined,
          starters: level.starters?.map((starter) => ({
            text: starter.text.trim(),
            hint: starter.hint.trim(),
          })),
        },
      })),
    })),
  }
}
