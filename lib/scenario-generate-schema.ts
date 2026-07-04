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
        tone: { type: "string" },
      },
      required: ["ageRange", "tone"],
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
  voice: { ageRange: string; tone: string }
  openingLine: { text: string; hint: string }
  starters: Array<{ text: string; hint: string }>
  imagePrompt: string
}
