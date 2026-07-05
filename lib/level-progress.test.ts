import { describe, expect, test } from "bun:test"

import type { Character } from "@/lib/character"
import {
  firstPlayableLevelIndex,
  isLevelUnlocked,
  suggestedLevelIndex,
  trackProgressSummary,
} from "@/lib/level-progress"

const track: Character = {
  id: "test-track",
  name: "Test",
  tagline: "t",
  category: "professional",
  avatarPrompt: "x",
  voice: { ageRange: "30", tone: "calm" },
  persona: "p",
  levels: [
    { kind: "voice", id: "l1", title: "One", subtitle: "a" },
    { kind: "gesture", id: "l2", title: "Two", subtitle: "b", steps: [], winMessage: "w" },
    { kind: "voice", id: "l3", title: "Three", subtitle: "c" },
    { kind: "voice", id: "l4", title: "Pro", subtitle: "d", status: "locked", lockLabel: "Pro" },
  ],
}

describe("level progression", () => {
  test("only first level unlocked initially", () => {
    expect(firstPlayableLevelIndex(track)).toBe(0)
    expect(isLevelUnlocked(track, 0, [])).toBe(true)
    expect(isLevelUnlocked(track, 1, [])).toBe(false)
    expect(isLevelUnlocked(track, 2, [])).toBe(false)
    expect(isLevelUnlocked(track, 3, [])).toBe(false)
  })

  test("completing l1 unlocks l2", () => {
    expect(isLevelUnlocked(track, 1, ["l1"])).toBe(true)
    expect(isLevelUnlocked(track, 2, ["l1"])).toBe(false)
  })

  test("completing l1 and l2 unlocks l3", () => {
    expect(isLevelUnlocked(track, 2, ["l1", "l2"])).toBe(true)
  })

  test("wip levels never unlock via progression", () => {
    expect(isLevelUnlocked(track, 3, ["l1", "l2", "l3"])).toBe(false)
  })

  test("suggested level is first incomplete unlocked", () => {
    expect(suggestedLevelIndex(track, [])).toBe(0)
    expect(suggestedLevelIndex(track, ["l1"])).toBe(1)
    expect(suggestedLevelIndex(track, ["l1", "l2"])).toBe(2)
    expect(suggestedLevelIndex(track, ["l1", "l2", "l3"])).toBe(2)
  })

  test("track progress summary counts playable levels only", () => {
    expect(trackProgressSummary(track, ["l1"])).toEqual({ completed: 1, total: 3 })
  })
})
