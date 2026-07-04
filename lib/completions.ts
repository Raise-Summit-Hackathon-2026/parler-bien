const STORAGE_KEY = "parler-bien:completed"

export function getCompletedScenarios(): string[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function markScenarioCompleted(id: string) {
  if (typeof window === "undefined") return

  const completed = getCompletedScenarios()
  if (completed.includes(id)) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed, id]))
  } catch {
    // storage unavailable — completion badge just won't persist
  }
}
