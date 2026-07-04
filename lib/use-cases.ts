import type { LinguaTrainerId } from "@/lib/lingua-trainers"
import { LINGUA_TRAINERS } from "@/lib/lingua-trainers"
import { SCENARIOS, type BuiltInScenarioId, type Scenario } from "@/lib/scenarios"

export type UseCaseId =
  | "language"
  | "sales"
  | "lingua"
  | "rich_laugh"
  | "team"
  | "agents"
  | "voice_clone"

export type UseCaseStatus = "live" | "coming_soon"

export type UseCase = {
  id: UseCaseId
  title: string
  description: string
  status: UseCaseStatus
  /** Optional external reference (personal agents) */
  href?: string
  hrefLabel?: string
}

export const USE_CASES: UseCase[] = [
  {
    id: "language",
    title: "Language practice",
    description:
      "Pronunciation and real conversation — nail the French r in croissant, charm the boulanger, pass the waiter test.",
    status: "live",
  },
  {
    id: "sales",
    title: "Sales practice",
    description:
      "Cold opens, objections, and closes — AI scores delivery under pressure, not your slide deck.",
    status: "live",
  },
  {
    id: "lingua",
    title: "Lingua practice",
    description:
      "Room-fit delivery — investor cadence, status gates, and the voice that belongs in the room.",
    status: "live",
  },
  {
    id: "rich_laugh",
    title: "Rich laugh practice",
    description:
      "Social laugh literacy — old money chuckle vs nervous giggle, with reference clips and a score.",
    status: "live",
  },
  {
    id: "team",
    title: "Team workspaces",
    description:
      "Shared drills, leaderboards, and manager review — practice as a team, not alone.",
    status: "coming_soon",
  },
  {
    id: "agents",
    title: "Personal agents",
    description:
      "Situationally aware agent — talk in your browser (voice in/out), connect Gmail via Composio.",
    status: "live",
    href: "/agent",
    hrefLabel: "Open agent →",
  },
  {
    id: "voice_clone",
    title: "Voice cloning",
    description:
      "Train on your best take, replay your delivery — clone the voice that closes.",
    status: "coming_soon",
  },
]

const LANGUAGE_SCENARIO_IDS: BuiltInScenarioId[] = [
  "teacher",
  "boulanger",
  "waiter",
  "parisian",
  "taxi",
  "sommelier",
]

const SALES_ROLEPLAY_IDS: BuiltInScenarioId[] = ["vendor", "landlord"]

const SALES_TRAINER_IDS: LinguaTrainerId[] = ["sales_pitch"]
const LINGUA_TRAINER_IDS: LinguaTrainerId[] = ["vc_lingua"]
const LAUGH_TRAINER_IDS: LinguaTrainerId[] = ["rich_laugher"]

export function getUseCase(id: UseCaseId): UseCase {
  const found = USE_CASES.find((u) => u.id === id)
  if (!found) throw new Error(`Unknown use case: ${id}`)
  return found
}

export function getLanguagePracticeScenarios(): Scenario[] {
  return SCENARIOS.filter((s) =>
    (LANGUAGE_SCENARIO_IDS as readonly string[]).includes(s.id),
  )
}

export function getSalesPracticeScenarios(): Scenario[] {
  const roleplay = SCENARIOS.filter((s) =>
    (SALES_ROLEPLAY_IDS as readonly string[]).includes(s.id),
  )
  const trainers = LINGUA_TRAINERS.filter((t) =>
    (SALES_TRAINER_IDS as readonly string[]).includes(t.id),
  )
  return [...trainers, ...roleplay]
}

export function getLinguaPracticeScenarios(): Scenario[] {
  return LINGUA_TRAINERS.filter((t) =>
    (LINGUA_TRAINER_IDS as readonly string[]).includes(t.id),
  )
}

export function getRichLaughPracticeScenarios(): Scenario[] {
  return LINGUA_TRAINERS.filter((t) =>
    (LAUGH_TRAINER_IDS as readonly string[]).includes(t.id),
  )
}

export function getScenariosForUseCase(id: UseCaseId): Scenario[] {
  switch (id) {
    case "language":
      return getLanguagePracticeScenarios()
    case "sales":
      return getSalesPracticeScenarios()
    case "lingua":
      return getLinguaPracticeScenarios()
    case "rich_laugh":
      return getRichLaughPracticeScenarios()
    default:
      return []
  }
}
