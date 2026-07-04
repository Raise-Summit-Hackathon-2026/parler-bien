import type { SentenceSuggestion } from "@/lib/types"
import type { BuiltInScenarioId, Scenario } from "@/lib/scenarios"

export const LINGUA_TRAINER_IDS = [
  "sales_pitch",
  "vc_lingua",
  "rich_laugher",
] as const

export type LinguaTrainerId = (typeof LINGUA_TRAINER_IDS)[number]

export function isLinguaTrainerId(id: string): id is LinguaTrainerId {
  return (LINGUA_TRAINER_IDS as readonly string[]).includes(id)
}

export function isTrainerScenarioId(id: BuiltInScenarioId): boolean {
  return id === "teacher" || isLinguaTrainerId(id)
}

const SALES_PITCH_STARTERS: SentenceSuggestion[] = [
  {
    text: "Hi Sarah — this is Alex. Did I catch you at a bad time?",
    hint: "Warm, brief, permission-based open.",
  },
  {
    text: "We help reps practice pitch delivery before the live call — AI scores how you sound.",
    hint: "One-sentence value prop · land the outcome.",
  },
  {
    text: "I hear you — most teams already have a CRM. The gap isn't the script, it's delivery under pressure.",
    hint: "Acknowledge objection · reframe without arguing.",
  },
  {
    text: "What does your team do today when a rep's close rate drops?",
    hint: "Open discovery · curious, not interrogating.",
  },
  {
    text: "If I send a one-pager, would Tuesday or Thursday work for fifteen minutes?",
    hint: "Assumptive close · binary choice, downward inflection.",
  },
]

const VC_STARTERS: SentenceSuggestion[] = [
  {
    text: "We're raising a seed round — twelve million pre, default alive.",
    hint: "Conviction without uptalk · land the number.",
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
    case "sales_pitch":
      return SALES_PITCH_STARTERS
    case "vc_lingua":
      return VC_STARTERS
    case "rich_laugher":
      return RICH_LAUGHER_STARTERS
  }
}

export const LINGUA_TRAINERS: Scenario[] = [
  {
    id: "sales_pitch",
    title: "Sales Pitch Coach",
    tagline: "Cold open to close — train delivery, not the deck.",
    goal: null,
    meterLabel: null,
    winMessage: null,
    persona: "",
    voice: {
      ageRange: "35-45",
      tone:
        "Seasoned sales leader. Direct, supportive, allergic to filler and fake urgency. Coaches like you've closed seven-figure deals and still remember your first cold call.",
    },
    content: { en: { openingLine: null, starters: SALES_PITCH_STARTERS } },
    imagePrompt:
      "Modern sales floor with glass conference room, CRM dashboards blurred, confident professional energy, warm cinematic illustration, no text, no logos",
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
