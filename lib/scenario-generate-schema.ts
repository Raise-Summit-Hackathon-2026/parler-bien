export const generatedScenarioJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short scenario title, e.g. The Hotel Clerk" },
    tagline: { type: "string", description: "One-line hook for the scenario card" },
    goal: { type: "string", description: "What the user must achieve to win" },
    meterLabel: { type: "string", description: "Short label for the progress meter, e.g. Trust" },
    winMessage: { type: "string", description: "Celebration message when goal is achieved" },
    persona: {
      type: "string",
      description:
        "Full character instructions including {characterGender} placeholder, age range, meter rules (0-100), goal_achieved at >=90, and pronunciation scoring. Match the style of existing roleplay scenarios.",
    },
    voice: {
      type: "object",
      properties: {
        ageRange: { type: "string" },
        gender: {
          type: "string",
          enum: ["male", "female", "random", "opposite-speaker"],
          description:
            "Character voice gender behavior. Prefer random unless the source clearly implies a specific gender. Use opposite-speaker only for coach/teacher-style agents.",
        },
        voices: {
          type: "object",
          description:
            "Optional Gemini voice overrides by resolved character gender. Choose distinct voices only when it helps the agent feel specific.",
          properties: {
            female: { type: "string" },
            male: { type: "string" },
            default: { type: "string" },
          },
          additionalProperties: false,
        },
        tone: { type: "string" },
      },
      required: ["ageRange", "gender", "tone"],
      additionalProperties: false,
    },
    openingLine: {
      type: "object",
      properties: {
        text: { type: "string", description: "Character's first line in the target language" },
        hint: { type: "string", description: "Short English gloss" },
      },
      required: ["text", "hint"],
      additionalProperties: false,
    },
    starters: {
      type: "array",
      description: "Exactly 3 example sentences the user could say to start or continue",
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
    imagePrompt: {
      type: "string",
      description:
        "Cinematic scene illustration prompt for the scenario setting. End with: cinematic illustration, no text, no logos",
    },
  },
  required: [
    "title",
    "tagline",
    "goal",
    "meterLabel",
    "winMessage",
    "persona",
    "voice",
    "openingLine",
    "starters",
    "imagePrompt",
  ],
  additionalProperties: false,
} as const

export type GeneratedScenarioPayload = {
  title: string
  tagline: string
  goal: string
  meterLabel: string
  winMessage: string
  persona: string
  voice: {
    ageRange: string
    gender: "male" | "female" | "random" | "opposite-speaker"
    voices?: { female?: string; male?: string; default?: string }
    tone: string
  }
  openingLine: { text: string; hint: string }
  starters: Array<{ text: string; hint: string }>
  imagePrompt: string
}
