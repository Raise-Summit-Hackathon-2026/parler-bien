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
    transcript: {
      type: "string",
      description:
        "The sentence being scored — the target phrase or what the user said",
    },
    reply: {
      type: "object",
      description:
        "Character or teacher response in the practice language with English hint. For teacher mode this is coach feedback.",
      properties: {
        text: {
          type: "string",
          description:
            "Visible text shown to the user. Natural prose only; do not include bracketed performance tags.",
        },
        tts_text: {
          type: "string",
          description:
            "Audio-only version of text. Use the same spoken words as text, but add sparse Gemini square-bracket performance tags where they improve delivery, such as [whispers], [laughs softly], [sighs], [excited], [curious], or [slowly]. Tags are delivery cues, not spoken words.",
        },
        hint: { type: "string", description: "Short English gloss" },
      },
      required: ["text", "tts_text", "hint"],
      additionalProperties: false,
    },
    meter: {
      type: "number",
      description:
        "Goal progress 0-100 for scenario mode. Use 0 for teacher mode.",
    },
    goal_achieved: {
      type: "boolean",
      description: "True when scenario goal is met. Always false for teacher.",
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
        "Exactly 3 follow-up sentences the user could say next in the practice language",
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
        accent: { type: "string" },
        age_range: { type: "string" },
        gender: {
          type: "string",
          enum: ["male", "female", "unsure"],
        },
        notes: { type: "string" },
      },
      required: ["accent", "age_range", "gender", "notes"],
      additionalProperties: false,
    },
  },
  required: [
    "overall_score",
    "coaching",
    "transcript",
    "reply",
    "meter",
    "goal_achieved",
    "words",
    "next_sentences",
    "speaker",
  ],
  additionalProperties: false,
} as const
