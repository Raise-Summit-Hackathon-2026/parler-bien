import type { LevelStatus } from "@/lib/tracks"
import { getPlayableLevels, getTrack, getTrackLevel } from "@/lib/tracks"

const STORAGE_KEY = "parler-bien:track-progress"

export type LevelProgress = {
  levelId: string
  status: "available" | "in_progress" | "completed"
  bestScore?: number
  completedAt?: number
  attempts: number
}

export type TrackProgress = {
  trackId: string
  levels: Record<string, LevelProgress>
  currentLevelId: string | null
}

type ProgressStore = Record<string, TrackProgress>

function readStore(): ProgressStore {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressStore) : {}
  } catch {
    return {}
  }
}

function writeStore(store: ProgressStore) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // storage unavailable
  }
}

function ensureTrackProgress(trackId: string): TrackProgress {
  const store = readStore()
  if (store[trackId]) return store[trackId]

  const track = getTrack(trackId)
  const playable = getPlayableLevels(track)
  const firstLevel = playable[0]

  const progress: TrackProgress = {
    trackId,
    levels: firstLevel
      ? {
          [firstLevel.id]: {
            levelId: firstLevel.id,
            status: "available",
            attempts: 0,
          },
        }
      : {},
    currentLevelId: firstLevel?.id ?? null,
  }

  store[trackId] = progress
  writeStore(store)
  return progress
}

export function getTrackProgress(trackId: string): TrackProgress {
  const store = readStore()
  if (store[trackId]) return store[trackId]
  return ensureTrackProgress(trackId)
}

export function markLevelInProgress(trackId: string, levelId: string) {
  const store = readStore()
  const progress = store[trackId] ?? ensureTrackProgress(trackId)

  const existing = progress.levels[levelId]
  if (!existing || existing.status === "completed") return

  progress.levels[levelId] = {
    ...existing,
    status: "in_progress",
    attempts: existing.attempts + 1,
  }
  progress.currentLevelId = levelId

  store[trackId] = progress
  writeStore(store)
}

export function markLevelCompleted(
  trackId: string,
  levelId: string,
  bestScore?: number,
) {
  const store = readStore()
  const progress = store[trackId] ?? ensureTrackProgress(trackId)
  const track = getTrack(trackId)

  const existing = progress.levels[levelId] ?? {
    levelId,
    status: "available" as const,
    attempts: 0,
  }

  progress.levels[levelId] = {
    ...existing,
    status: "completed",
    bestScore:
      bestScore !== undefined
        ? Math.max(bestScore, existing.bestScore ?? 0)
        : existing.bestScore,
    completedAt: Date.now(),
  }

  const playable = getPlayableLevels(track)
  const currentIndex = playable.findIndex((l) => l.id === levelId)
  const nextLevel = playable[currentIndex + 1]

  if (nextLevel) {
    const nextExisting = progress.levels[nextLevel.id]
    if (!nextExisting || nextExisting.status !== "completed") {
      progress.levels[nextLevel.id] = {
        levelId: nextLevel.id,
        status: "available",
        attempts: nextExisting?.attempts ?? 0,
      }
    }
    progress.currentLevelId = nextLevel.id
  } else {
    progress.currentLevelId = null
  }

  store[trackId] = progress
  writeStore(store)
}

export function getLevelStatus(trackId: string, levelId: string): LevelStatus {
  const level = getTrackLevel(trackId, levelId)

  if (level.status === "wip") return "wip"

  const progress = getTrackProgress(trackId)
  const levelProgress = progress.levels[levelId]

  if (levelProgress?.status === "completed") return "completed"
  if (levelProgress?.status === "in_progress") return "in_progress"
  if (levelProgress?.status === "available") return "available"

  const playable = getPlayableLevels(getTrack(trackId))
  const index = playable.findIndex((l) => l.id === levelId)
  if (index === 0) return "available"
  if (index > 0) {
    const prevLevel = playable[index - 1]
    const prevProgress = progress.levels[prevLevel.id]
    if (prevProgress?.status === "completed") return "available"
  }

  return "locked"
}

export function countCompletedLevels(trackId: string): number {
  const progress = getTrackProgress(trackId)
  const track = getTrack(trackId)
  const playable = getPlayableLevels(track)

  return playable.filter(
    (l) => progress.levels[l.id]?.status === "completed",
  ).length
}

export function isTrackComplete(trackId: string): boolean {
  const track = getTrack(trackId)
  const playable = getPlayableLevels(track)
  const completed = countCompletedLevels(trackId)
  return completed >= playable.length
}
