import type { Character, Level } from "@/lib/character"
import { isLevelPlayable } from "@/lib/character"

const STORAGE_KEY = "parler-bien:level-progress"

type LevelProgressStore = Record<string, string[]>

function readStore(): LevelProgressStore {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LevelProgressStore) : {}
  } catch {
    return {}
  }
}

function writeStore(store: LevelProgressStore) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore quota / private mode
  }
}

export function getCompletedLevelIds(characterId: string): string[] {
  return readStore()[characterId] ?? []
}

export function markLevelCompleted(characterId: string, levelId: string) {
  const store = readStore()
  const current = new Set(store[characterId] ?? [])
  if (current.has(levelId)) return

  current.add(levelId)
  writeStore({ ...store, [characterId]: [...current] })
}

export function isLevelCompleted(
  characterId: string,
  levelId: string,
  completedIds?: string[],
): boolean {
  const ids = completedIds ?? getCompletedLevelIds(characterId)
  return ids.includes(levelId)
}

/** Index of the first playable level in the track. */
export function firstPlayableLevelIndex(character: Character): number {
  return character.levels.findIndex(isLevelPlayable)
}

/** Previous playable level before `levelIndex`, or null if none. */
export function previousPlayableLevelIndex(
  character: Character,
  levelIndex: number,
): number | null {
  for (let i = levelIndex - 1; i >= 0; i--) {
    if (isLevelPlayable(character.levels[i]!)) return i
  }
  return null
}

/**
 * Progression unlock: first playable level is always open; each next playable
 * level unlocks when the previous playable level is completed.
 * WIP / Pro levels (status locked|wip) never unlock via progression.
 */
export function isLevelUnlocked(
  character: Character,
  levelIndex: number,
  completedLevelIds: string[],
): boolean {
  const level = character.levels[levelIndex]
  if (!level || !isLevelPlayable(level)) return false

  const first = firstPlayableLevelIndex(character)
  if (levelIndex === first) return true

  const prevIndex = previousPlayableLevelIndex(character, levelIndex)
  if (prevIndex === null) return true

  const prevLevel = character.levels[prevIndex]!
  return completedLevelIds.includes(prevLevel.id)
}

/** Highest index the user may enter (last consecutive unlocked level). */
export function highestUnlockedLevelIndex(
  character: Character,
  completedLevelIds: string[],
): number {
  let highest = firstPlayableLevelIndex(character)
  for (let i = 0; i < character.levels.length; i++) {
    if (isLevelUnlocked(character, i, completedLevelIds)) highest = i
  }
  return highest
}

/** Suggested level to highlight on the path (first incomplete unlocked, else last). */
export function suggestedLevelIndex(
  character: Character,
  completedLevelIds: string[],
): number {
  for (let i = 0; i < character.levels.length; i++) {
    const level = character.levels[i]!
    if (!isLevelPlayable(level)) continue
    if (!isLevelUnlocked(character, i, completedLevelIds)) break
    if (!completedLevelIds.includes(level.id)) return i
  }
  return highestUnlockedLevelIndex(character, completedLevelIds)
}

export type LevelPathState = "completed" | "current" | "unlocked" | "locked" | "coming-soon"

export function getLevelPathState(
  character: Character,
  level: Level,
  levelIndex: number,
  activeLevelIndex: number,
  completedLevelIds: string[],
): LevelPathState {
  if (!isLevelPlayable(level)) return "coming-soon"
  if (completedLevelIds.includes(level.id)) return "completed"
  if (levelIndex === activeLevelIndex) return "current"
  if (isLevelUnlocked(character, levelIndex, completedLevelIds)) return "unlocked"
  return "locked"
}

export function trackProgressSummary(
  character: Character,
  completedLevelIds: string[],
): { completed: number; total: number } {
  const playable = character.levels.filter(isLevelPlayable)
  const completed = playable.filter((l) => completedLevelIds.includes(l.id)).length
  return { completed, total: playable.length }
}
