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
  },
  required: ["overall_score", "coaching", "words"],
  additionalProperties: false,
} as const
