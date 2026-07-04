const STORAGE_KEY = "parler-bien:live-avatar-enabled"

export function getLiveAvatarEnabledPreference(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function setLiveAvatarEnabledPreference(enabled: boolean) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false")
  } catch {
    // ignore quota / privacy mode
  }
}
