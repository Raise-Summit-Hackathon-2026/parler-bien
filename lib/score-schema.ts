export const pronunciationScoreJsonSchema = {
  type: "object",
  properties: {
    overall_score: {
      type: "number",
      description: "Overall pronunciation score from 0 to 100",
    },
    coaching: {
      type: "string",
      description: "One short encouraging sentence with the main fix",
    },
    voice_line: {
      type: "string",
      description:
        "Short spoken reaction for TTS from a native French teacher matching the speaker's gender and age. Warm, clear, professional — not flirtatious. Tease one next conversational step.",
    },
    transcript: {
      type: "string",
      description:
        "The French sentence being scored — the target phrase or what the user said in free mode",
    },
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          score: { type: "number" },
          issue: { type: ["string", "null"] },
          tip: { type: ["string", "null"] },
        },
        required: ["word", "score", "issue", "tip"],
        additionalProperties: false,
      },
    },
    next_sentences: {
      type: "array",
      description:
        "Exactly 3 French follow-up sentences that continue the conversation naturally",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          hint: { type: "string", description: "Short English gloss" },
        },
        required: ["text", "hint"],
        additionalProperties: false,
      },
    },
    speaker: {
      type: "object",
      description: "Voice metadata inferred from the recording",
      properties: {
        accent: {
          type: "string",
          description:
            "Detected native/source accent influencing French (e.g. American English, Dutch, Spanish)",
        },
        age_range: {
          type: "string",
          description: "Rough age estimate (e.g. 20-30)",
        },
        gender: {
          type: "string",
          enum: ["male", "female", "unsure"],
        },
        notes: {
          type: "string",
          description:
            "One short sentence on how this speaker profile affects their French pronunciation",
        },
      },
      required: ["accent", "age_range", "gender", "notes"],
      additionalProperties: false,
    },
  },
  required: [
    "overall_score",
    "coaching",
    "voice_line",
    "transcript",
    "words",
    "next_sentences",
    "speaker",
  ],
  additionalProperties: false,
} as const
