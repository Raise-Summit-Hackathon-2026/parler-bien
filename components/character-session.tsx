"use client"

import { useCallback, useState } from "react"

import { GestureSession } from "@/components/gesture-session"
import { LevelPath } from "@/components/level-path"
import { PracticeSession } from "@/components/practice-session"
import { SessionShell } from "@/components/session-shell"
import {
  isLevelPlayable,
  playableLevels,
  type Character,
} from "@/lib/character"
import { markScenarioCompleted } from "@/lib/completions"
import {
  getCompletedLevelIds,
  isLevelUnlocked,
  markLevelCompleted,
  suggestedLevelIndex,
  trackProgressSummary,
} from "@/lib/level-progress"

type CharacterSessionProps = {
  character: Character
  onBack: () => void
  backLabel?: string
}

type SessionPhase = "path" | "play"

export function CharacterSession({ character, onBack, backLabel }: CharacterSessionProps) {
  const multiLevel = playableLevels(character).length > 1

  const [phase, setPhase] = useState<SessionPhase>(() => (multiLevel ? "path" : "play"))
  const [completedLevelIds, setCompletedLevelIds] = useState(() =>
    getCompletedLevelIds(character.id),
  )
  const [levelIndex, setLevelIndex] = useState(() =>
    suggestedLevelIndex(character, getCompletedLevelIds(character.id)),
  )

  const level = character.levels[levelIndex]
  const refreshProgress = useCallback(() => {
    setCompletedLevelIds(getCompletedLevelIds(character.id))
  }, [character.id])

  const handleLevelComplete = useCallback(() => {
    const current = character.levels[levelIndex]
    if (current) {
      markLevelCompleted(character.id, current.id)
      const updated = getCompletedLevelIds(character.id)
      setCompletedLevelIds(updated)

      const { completed, total } = trackProgressSummary(character, updated)
      if (completed >= total && total > 0) {
        markScenarioCompleted(character.id)
      }

      setLevelIndex(suggestedLevelIndex(character, updated))
    }

    if (multiLevel) {
      setPhase("path")
    } else {
      onBack()
    }
  }, [character, levelIndex, multiLevel, onBack])

  const handleSelectLevel = useCallback(
    (index: number) => {
      if (!isLevelUnlocked(character, index, completedLevelIds)) return
      setLevelIndex(index)
      setPhase("play")
    },
    [character, completedLevelIds],
  )

  const handleShellBack = useCallback(() => {
    if (phase === "play" && multiLevel) {
      refreshProgress()
      setPhase("path")
      return
    }
    onBack()
  }, [phase, multiLevel, onBack, refreshProgress])

  if (phase === "path" && multiLevel) {
    return (
      <SessionShell onBack={handleShellBack} backLabel={backLabel}>
        <LevelPath
          character={character}
          completedLevelIds={completedLevelIds}
          activeLevelIndex={levelIndex}
          onSelectLevel={handleSelectLevel}
        />
      </SessionShell>
    )
  }

  if (
    phase === "play" &&
    (!level || !isLevelPlayable(level) || !isLevelUnlocked(character, levelIndex, completedLevelIds))
  ) {
    return (
      <SessionShell onBack={handleShellBack} backLabel={backLabel}>
        <LevelPath
          character={character}
          completedLevelIds={completedLevelIds}
          activeLevelIndex={suggestedLevelIndex(character, completedLevelIds)}
          onSelectLevel={handleSelectLevel}
        />
      </SessionShell>
    )
  }

  if (!level || !isLevelPlayable(level)) {
    return (
      <SessionShell onBack={handleShellBack} backLabel={backLabel}>
        <p className="text-center text-sm text-muted-foreground">No playable level found.</p>
      </SessionShell>
    )
  }

  if (level.kind === "gesture") {
    return (
      <GestureSession
        key={`${character.id}-${level.id}`}
        character={character}
        steps={level.steps}
        holdMs={level.holdMs}
        sessionTitle={level.title}
        winMessage={level.winMessage}
        onComplete={handleLevelComplete}
        onBack={handleShellBack}
        backLabel={multiLevel ? "Track" : backLabel}
        completeLabel={multiLevel ? "Back to track" : `Back to ${backLabel?.toLowerCase() ?? "free play"}`}
        showLevelStrip={false}
      />
    )
  }

  return (
    <PracticeSession
      key={`${character.id}-${level.id}`}
      character={character}
      levelIndex={levelIndex}
      onBack={handleShellBack}
      backLabel={multiLevel ? "Track" : backLabel}
      onContinue={multiLevel ? handleLevelComplete : undefined}
      continueLabel={multiLevel ? "Back to track" : undefined}
      showLevelStrip={false}
    />
  )
}
