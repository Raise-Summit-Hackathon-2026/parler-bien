import type { Scenario, ScenarioId } from "@/lib/scenarios"

const STORAGE_KEY = "parler-bien:custom-scenarios"

export function getCustomScenarios(): Scenario[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Scenario[]) : []
  } catch {
    return []
  }
}

export function saveCustomScenario(scenario: Scenario) {
  if (typeof window === "undefined") return

  const existing = getCustomScenarios()
  const next = [scenario, ...existing.filter((item) => item.id !== scenario.id)]

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 12)))
  } catch {
    // storage unavailable
  }
}

export function deleteCustomScenario(id: ScenarioId) {
  if (typeof window === "undefined") return

  const next = getCustomScenarios().filter((scenario) => scenario.id !== id)

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable
  }
}
