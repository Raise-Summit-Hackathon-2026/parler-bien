"use client"

import { useState } from "react"

import { GestureSession } from "@/components/gesture-session"
import { PracticeSession } from "@/components/practice-session"
import type { Character } from "@/lib/character"

type CharacterSessionProps = {
  character: Character
  onBack: () => void
  backLabel?: string
}

export function CharacterSession({ character, onBack, backLabel }: CharacterSessionProps) {
  const [levelIndex, setLevelIndex] = useState(0)
  const level = character.levels[levelIndex]
  const isLast = levelIndex >= character.levels.length - 1

  function advance() {
    if (isLast) return onBack()
    setLevelIndex((i) => i + 1)
  }

  const next = character.levels[levelIndex + 1]
  const continueLabel = isLast
    ? `Back to ${backLabel?.toLowerCase() ?? "free play"}`
    : next
      ? `Continue — ${next.title}`
      : "Continue"

  if (!level) return null

  if (level.kind === "gesture") {
    return (
      <GestureSession
        key={`${character.id}-${level.id}`}
        character={character}
        steps={level.steps}
        holdMs={level.holdMs}
        sessionTitle={level.title}
        winMessage={level.winMessage}
        levelIndex={levelIndex}
        levelTotal={character.levels.length}
        onComplete={advance}
        onBack={onBack}
        backLabel={backLabel}
        completeLabel={continueLabel}
      />
    )
  }

  return (
    <PracticeSession
      key={`${character.id}-${level.id}`}
      character={character}
      levelIndex={levelIndex}
      onBack={onBack}
      backLabel={backLabel}
      onContinue={character.levels.length > 1 ? advance : undefined}
      continueLabel={continueLabel}
    />
  )
}
