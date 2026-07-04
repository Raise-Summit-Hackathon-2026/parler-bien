import type { BuiltInScenarioId } from "@/lib/scenarios"
import type { SentenceSuggestion } from "@/lib/types"

/** Locked hackathon demo trio — sales pitch golden path. */
export const DEMO_SCENARIO_IDS = [
  "sales_pitch",
  "sales_pitch",
  "vendor",
] as const

export type DemoScenarioId = "sales_pitch" | "vendor"

export type DemoBeat = {
  id: BuiltInScenarioId
  title: string
  moment: string
  durationSeconds: number
  presenterCue: string
  starter: SentenceSuggestion
  secondTakeTip: string
  languageId?: "fr" | "en"
  regionId?: "fr-FR" | "en-US"
}

export const DEMO_HOOK = {
  headline: "Your pitch fails in the first ten seconds.",
  subline: "Same script, two deliveries — AI scores how you sound, not what you say.",
  weakLine: "Um, hi, so I was just calling to maybe tell you about our platform…",
  strongLine:
    "Hi Sarah — this is Alex. Did I catch you at a bad time?",
} as const

export const DEMO_BEATS: DemoBeat[] = [
  {
    id: "sales_pitch",
    title: "Cold open",
    moment: "First impression",
    durationSeconds: 20,
    presenterCue:
      "Take 1: read flat with filler. Take 2: warm, brief, permission-based — show score jump.",
    starter: {
      text: "Hi Sarah — this is Alex. Did I catch you at a bad time?",
      hint: "Warm · brief · downward inflection on your name",
    },
    secondTakeTip:
      "Drop “um” and “just” — smile through the open, pause after their name.",
  },
  {
    id: "sales_pitch",
    title: "Objection + close",
    moment: "Negotiation",
    durationSeconds: 25,
    presenterCue:
      "Handle the CRM objection, then land the binary close — no uptalk on the ask.",
    starter: {
      text: "I hear you — most teams already have a CRM. The gap isn't the script, it's delivery under pressure.",
      hint: "Acknowledge · reframe · then: Tuesday or Thursday for fifteen minutes?",
    },
    secondTakeTip:
      "Empathy first, reframe second — end the close down, not up.",
  },
  {
    id: "vendor",
    title: "The Market Vendor",
    moment: "Voice = leverage",
    durationSeconds: 25,
    presenterCue:
      "Same words, confident voice — haggle the lamp under twenty, show the meter move.",
    starter: {
      text: "Vingt euros, et on conclut?",
      hint: "French: firm offer · calm authority · no apology preface",
    },
    secondTakeTip:
      "Lower register, clear ending — confidence beats vocabulary.",
    languageId: "fr",
    regionId: "fr-FR",
  },
]

export const DEMO_CLOSE = {
  headline: "Parler Bien",
  tagline: "Train the moments where your voice closes the deal.",
  oneLiner:
    "Parler Bien scores sales delivery — opens, objections, and closes — so reps sound credible before the live call.",
} as const

export function getDemoBeat(index: number): DemoBeat | null {
  return DEMO_BEATS[index] ?? null
}

export function getDemoBeatIndex(scenarioId: string): number {
  if (scenarioId === "vendor") return 2
  if (scenarioId === "sales_pitch") return 0
  return -1
}

export function isDemoScenarioId(id: string): id is DemoScenarioId {
  return id === "sales_pitch" || id === "vendor"
}
