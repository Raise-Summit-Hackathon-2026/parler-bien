"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { GestureSession } from "@/components/gesture-session"
import { PracticeSession } from "@/components/practice-session"
import { getBuiltInCharacter } from "@/lib/characters"
import {
  getExperienceAgent,
  nextExperienceLevelLabel,
  type ExperienceGestureLevel,
  type ExperienceVoiceLevel,
  type FreePlayExperience,
} from "@/lib/free-play-experiences"

type FreePlayExperienceRunnerProps = {
  experience: FreePlayExperience
}

export function FreePlayExperienceRunner({
  experience,
}: FreePlayExperienceRunnerProps) {
  const router = useRouter()
  const agent = getExperienceAgent(experience)
  const [levelIndex, setLevelIndex] = useState(0)

  const level = experience.levels[levelIndex]
  const levelTotal = experience.levels.length
  const isLastLevel = levelIndex >= levelTotal - 1
  const handleBack = () => router.push("/#free-play")

  function advanceLevel() {
    if (isLastLevel) {
      handleBack()
      return
    }
    setLevelIndex((index) => index + 1)
  }

  const nextLabel = nextExperienceLevelLabel(experience, levelIndex)
  const continueLabel = isLastLevel
    ? "Back to free play"
    : nextLabel
      ? `Continue — ${nextLabel}`
      : "Continue"

  if (level.type === "voice") {
    const voiceLevel = level as ExperienceVoiceLevel

    return (
      <PracticeSession
        key={`${experience.id}-${voiceLevel.id}`}
        character={getBuiltInCharacter("captain-eva")}
        levelIndex={levelIndex}
        onBack={handleBack}
        onContinue={advanceLevel}
        continueLabel={continueLabel}
      />
    )
  }

  const gestureLevel = level as ExperienceGestureLevel

  return (
    <GestureSession
      key={`${experience.id}-${gestureLevel.id}`}
      agent={agent}
      steps={gestureLevel.steps}
      holdMs={gestureLevel.holdMs}
      sessionTitle={gestureLevel.gestureTitle}
      winMessage={gestureLevel.winMessage}
      levelIndex={levelIndex}
      levelTotal={levelTotal}
      onComplete={advanceLevel}
      onBack={handleBack}
      backLabel="Free play"
      completeLabel={continueLabel}
    />
  )
}
