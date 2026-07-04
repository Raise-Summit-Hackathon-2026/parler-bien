export const generatedWorkspaceJsonSchema = {
  type: "object",
  properties: {
    workspace: {
      type: "object",
      properties: {
        name: { type: "string", description: "Workspace display name" },
        description: { type: "string", description: "What this training program covers" },
        companyName: { type: "string", description: "Company or team name" },
        themeColor: { type: "string", description: "Hex color e.g. #c41e3a" },
      },
      required: ["name", "description", "companyName", "themeColor"],
      additionalProperties: false,
    },
    contextSummary: {
      type: "string",
      description:
        "Extracted training guidelines from the source material, saved as context for personas",
    },
    personas: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Stable slug key referenced by tracks, e.g. sales-coach",
          },
          name: { type: "string" },
          roleTitle: { type: "string" },
          tagline: { type: "string" },
          agentType: {
            type: "string",
            enum: ["language", "roleplay", "spiritual"],
          },
          capabilities: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "pronunciation_score",
                "word_breakdown",
                "goal_meter",
                "goal_completion",
                "reflection_prompt",
              ],
            },
          },
          voiceAgeRange: { type: "string" },
          voiceGender: {
            type: "string",
            enum: ["male", "female", "random", "opposite-speaker"],
          },
          voiceTone: { type: "string" },
          deliveryStyle: { type: "string" },
          coachingStyle: { type: "string" },
          skills: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                description: { type: "string" },
              },
              required: ["id", "label", "description"],
              additionalProperties: false,
            },
          },
          previewScript: { type: "string" },
          personaBase: {
            type: "string",
            description:
              "Full persona instructions with meter rules 0-100, concede at 90+, never quote scripts",
          },
          avatarPrompt: { type: "string" },
          greeting: { type: "string" },
          themeColor: { type: "string" },
        },
        required: [
          "key",
          "name",
          "roleTitle",
          "tagline",
          "agentType",
          "capabilities",
          "voiceAgeRange",
          "voiceGender",
          "voiceTone",
          "deliveryStyle",
          "coachingStyle",
          "skills",
          "previewScript",
          "personaBase",
          "avatarPrompt",
          "greeting",
          "themeColor",
        ],
        additionalProperties: false,
      },
    },
    tracks: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          themeColor: { type: "string" },
          estimatedMinutes: { type: "number" },
          personaKey: { type: "string" },
          levels: {
            type: "array",
            minItems: 2,
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                position: { type: "number" },
                title: { type: "string" },
                subtitle: { type: "string" },
                passCriteriaType: {
                  type: "string",
                  enum: ["goal", "pronunciation", "complete"],
                },
                minScore: { type: "number" },
                minTurns: { type: "number" },
                targetPhrase: { type: "string" },
                goal: { type: "string" },
                meterLabel: { type: "string" },
                winMessage: { type: "string" },
                customPersonaOverlay: { type: "string" },
                openingLineText: { type: "string" },
                openingLineHint: { type: "string" },
                starters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      hint: { type: "string" },
                    },
                    required: ["text", "hint"],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "position",
                "title",
                "subtitle",
                "passCriteriaType",
                "winMessage",
              ],
              additionalProperties: false,
            },
          },
        },
        required: [
          "title",
          "description",
          "themeColor",
          "estimatedMinutes",
          "personaKey",
          "levels",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["workspace", "contextSummary", "personas", "tracks"],
  additionalProperties: false,
} as const

export type GeneratedWorkspacePayload = {
  workspace: {
    name: string
    description: string
    companyName: string
    themeColor: string
  }
  contextSummary: string
  personas: Array<{
    key: string
    name: string
    roleTitle: string
    tagline: string
    agentType: "language" | "roleplay" | "spiritual"
    capabilities: Array<
      | "pronunciation_score"
      | "word_breakdown"
      | "goal_meter"
      | "goal_completion"
      | "reflection_prompt"
    >
    voiceAgeRange: string
    voiceGender: "male" | "female" | "random" | "opposite-speaker"
    voiceTone: string
    deliveryStyle: string
    coachingStyle: string
    skills: Array<{ id: string; label: string; description: string }>
    previewScript: string
    personaBase: string
    avatarPrompt: string
    greeting: string
    themeColor: string
  }>
  tracks: Array<{
    title: string
    description: string
    themeColor: string
    estimatedMinutes: number
    personaKey: string
    levels: Array<{
      position: number
      title: string
      subtitle: string
      passCriteriaType: "goal" | "pronunciation" | "complete"
      minScore?: number
      minTurns?: number
      targetPhrase?: string
      goal?: string
      meterLabel?: string
      winMessage: string
      customPersonaOverlay?: string
      openingLineText?: string
      openingLineHint?: string
      starters?: Array<{ text: string; hint: string }>
    }>
  }>
}
