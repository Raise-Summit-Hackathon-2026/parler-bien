import {
  countPlayableLevels,
  TRACKS,
  type LearningTrack,
} from "@/lib/tracks"
import { countCompletedLevels } from "@/lib/track-progress"

export type CompanyHub = {
  id: string
  name: string
  description: string
  imagePrompt: string
  themeColor: string
  location: string
  trackIds: string[]
}

export const COMPANY_HUBS: CompanyHub[] = [
  {
    id: "galeries-lafayette",
    name: "Galeries Lafayette",
    description:
      "Train under the legendary Paris dome — three career paths in luxury retail.",
    imagePrompt:
      "Galeries Lafayette Paris Haussmann stained glass dome interior, art nouveau balconies, luxury department store, golden afternoon light",
    themeColor: "#1a1a2e",
    location: "Paris Haussmann",
    trackIds: ["glaf-sales", "glaf-security", "glaf-satisfaction"],
  },
]

export function getCompanyHub(id: string): CompanyHub {
  const hub = COMPANY_HUBS.find((h) => h.id === id)
  if (!hub) throw new Error(`Unknown company hub: ${id}`)
  return hub
}

export function getCompanyTracks(hub: CompanyHub): LearningTrack[] {
  return hub.trackIds
    .map((id) => TRACKS.find((t) => t.id === id))
    .filter((t): t is LearningTrack => Boolean(t))
}

export function getStandaloneTracks(): LearningTrack[] {
  return TRACKS.filter((t) => !t.companyId)
}

export function countCompanyProgress(hub: CompanyHub): {
  completed: number
  total: number
} {
  const tracks = getCompanyTracks(hub)
  let completed = 0
  let total = 0

  for (const track of tracks) {
    total += countPlayableLevels(track)
    completed += countCompletedLevels(track.id)
  }

  return { completed, total }
}

export function isCompanyTrackComplete(hub: CompanyHub): boolean {
  const { completed, total } = countCompanyProgress(hub)
  return total > 0 && completed >= total
}
