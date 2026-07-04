import type { LanguageId } from "@/lib/languages"
import type { LearningTrack } from "@/lib/tracks"

export function scenarioLanguageForTrack(
  track: LearningTrack,
  languageId: LanguageId,
): LanguageId {
  if (
    track.id === "french-pronunciation" ||
    track.companyId === "galeries-lafayette"
  ) {
    return "fr"
  }
  if (track.id === "cabin-crew" || track.id === "path-with-buddha") {
    return "en"
  }
  return languageId
}

export function trackBackHref(track: LearningTrack): string {
  if (track.companyId) {
    return `/teams/${track.companyId}`
  }
  return "/"
}
