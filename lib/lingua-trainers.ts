import type { SentenceSuggestion } from "@/lib/types"
import type { BuiltInScenarioId, Scenario } from "@/lib/scenarios"

export const LINGUA_TRAINER_IDS = [
  "genz",
  "vc_lingua",
  "hot_girl_lingua",
  "rich_laugher",
] as const

export type LinguaTrainerId = (typeof LINGUA_TRAINER_IDS)[number]

export function isLinguaTrainerId(id: string): id is LinguaTrainerId {
  return (LINGUA_TRAINER_IDS as readonly string[]).includes(id)
}

export function isTrainerScenarioId(id: BuiltInScenarioId): boolean {
  return id === "teacher" || isLinguaTrainerId(id)
}

const GENZ_STARTERS: SentenceSuggestion[] = [
  { text: "No cap, that was actually fire.", hint: "Authentic hype — no filler words." },
  { text: "It's giving main character energy.", hint: "Classic Gen Z metaphor." },
  { text: "I'm low-key obsessed with this.", hint: "Understated enthusiasm." },
  { text: "That's so mid, fr fr.", hint: "Dismissive but playful." },
  { text: "We need to lock in before the function.", hint: "Party/event slang." },
]

const VC_STARTERS: SentenceSuggestion[] = [
  {
    text: "We're pre-revenue but post-product-market-fit.",
    hint: "Classic paradox pitch line.",
  },
  {
    text: "Our TAM is massive — we're just capturing the wedge.",
    hint: "Market sizing + strategy.",
  },
  {
    text: "We're not raising yet, but happy to share our deck.",
    hint: "Soft fundraise flex.",
  },
  {
    text: "It's a platform play with strong network effects.",
    hint: "Buzzword bingo — use confidently.",
  },
  {
    text: "We're default alive and capital efficient.",
    hint: "Investor reassurance.",
  },
]

const HOT_GIRL_STARTERS: SentenceSuggestion[] = [
  { text: "Like, I literally cannot even.", hint: "Peak upspeak energy." },
  { text: "It's so aesthetic, I'm obsessed.", hint: "TikTok-core compliment." },
  { text: "Bestie, that's so valid.", hint: "Affirming your girlies." },
  { text: "The way I screamed — no because same.", hint: "Reaction posting IRL." },
  { text: "It's giving clean girl, low effort, high impact.", hint: "Trend vocabulary stack." },
]

const RICH_LAUGHER_STARTERS: SentenceSuggestion[] = [
  {
    text: "Laugh like old money — brief nasal exhale (hear: Restrained “ha ha”).",
    hint: "Target: old_money · 2 seconds max",
  },
  {
    text: "Laugh after your portfolio closed down 40%.",
    hint: "Restrained sympathy — not mirthful burst",
  },
  {
    text: "Laugh when someone says they fly commercial.",
    hint: "Polite at best — tiny knowing chuckle",
  },
  {
    text: "Do NOT laugh like a cartoon villain.",
    hint: "Anti-pattern: try_hard / satirical",
  },
  {
    text: "Laugh at a charity gala joke you didn't understand.",
    hint: "Polite closed-mouth — never nervous snorts",
  },
]

export function getLinguaTrainerStarters(id: LinguaTrainerId): SentenceSuggestion[] {
  switch (id) {
    case "genz":
      return GENZ_STARTERS
    case "vc_lingua":
      return VC_STARTERS
    case "hot_girl_lingua":
      return HOT_GIRL_STARTERS
    case "rich_laugher":
      return RICH_LAUGHER_STARTERS
  }
}

export const LINGUA_TRAINERS: Scenario[] = [
  {
    id: "genz",
    title: "Gen Z Lingua",
    tagline: "No cap — train your chronically online English.",
    goal: null,
    meterLabel: null,
    winMessage: null,
    persona: "",
    voice: {
      ageRange: "18-24",
      tone:
        "Chill chronically-online friend. Uses current slang naturally, never cringe or try-hard. Encouraging but roast-y when you're mid.",
    },
    content: { en: { openingLine: null, starters: GENZ_STARTERS } },
    imagePrompt:
      "Neon-lit Gen Z bedroom with LED strips, headphones, meme posters, purple and cyan glow, cinematic illustration, no text, no logos",
  },
  {
    id: "vc_lingua",
    title: "VC Lingua",
    tagline: "Pitch like you've already raised the Series A.",
    goal: null,
    meterLabel: null,
    winMessage: null,
    persona: "",
    voice: {
      ageRange: "30-40",
      tone:
        "Calm Sand Hill Road partner energy. Measured, slightly amused, speaks in crisp investor cadence. Never mean — just evaluating your fundability.",
    },
    content: { en: { openingLine: null, starters: VC_STARTERS } },
    imagePrompt:
      "Minimalist venture capital office overlooking Palo Alto hills, glass walls, espresso, cinematic illustration, no text, no logos",
  },
  {
    id: "hot_girl_lingua",
    title: "Hot Girl Lingua",
    tagline: "Main character speech for the group chat era.",
    goal: null,
    meterLabel: null,
    winMessage: null,
    persona: "",
    voice: {
      ageRange: "22-28",
      tone:
        "Supportive bestie energy. TikTok-native vocabulary, playful upspeak, affirming but honest when you're giving NPC.",
    },
    content: { en: { openingLine: null, starters: HOT_GIRL_STARTERS } },
    imagePrompt:
      "Soft pink aesthetic vanity setup with ring light, skincare, golden hour glow, cinematic illustration, no text, no logos",
  },
  {
    id: "rich_laugher",
    title: "Rich Laugher Trainer",
    tagline: "Evaluate your laugh. Old money or try-hard?",
    goal: null,
    meterLabel: null,
    winMessage: "Certified old-money chuckle. The yacht accepts you.",
    persona: "",
    voice: {
      ageRange: "45-55",
      tone:
        "Understated aristocratic coach. Dry wit, gentle cruelty, speaks like someone who has opinions about yacht clubs.",
    },
    content: { en: { openingLine: null, starters: RICH_LAUGHER_STARTERS } },
    imagePrompt:
      "Luxury drawing room with marble fireplace, velvet armchairs, champagne flute, warm golden light, cinematic illustration, no text, no logos",
  },
]
