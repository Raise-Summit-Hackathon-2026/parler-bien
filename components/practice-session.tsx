"use client"

import confetti from "canvas-confetti"
import { Bot, Loader2, Mic, Play, RotateCcw, Square } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type RefObject } from "react"

import { LevelStrip } from "@/components/level-strip"
import { useLanguage } from "@/components/language-provider"
import { ScenarioBackButton } from "@/components/scenario-back-button"
import { ScenarioScene } from "@/components/scenario-scene"
import {
  ExampleSuggestionCard,
  MeterBar,
  WordChip,
  scoreColor,
} from "@/components/session-hud"
import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useConversation } from "@/hooks/use-conversation"
import {
  characterLevelScenario,
  getScenarioContent,
  getScenarioFallbackLanguageId,
  type Character,
} from "@/lib/character"
import { isBuiltInCharacterId } from "@/lib/characters/index"
import { markScenarioCompleted } from "@/lib/completions"
import { pickRandomSentences } from "@/lib/sentences"
import type { ConversationTurn, SentenceSuggestion } from "@/lib/types"
import { cn } from "@/lib/utils"

const EXAMPLE_COUNT = 4

export type PracticeSessionProps = {
  character: Character
  levelIndex: number
  onBack: () => void
  backLabel?: string
  /** Multi-level: advance to next level once this one's goal is achieved */
  onContinue?: () => void
  continueLabel?: string
}

function ConversationLog({
  history,
  onPlayCharacter,
  disabled,
  endRef,
}: {
  history: ConversationTurn[]
  onPlayCharacter: (text: string) => void
  disabled: boolean
  endRef: RefObject<HTMLDivElement | null>
}) {
  if (history.length === 0) return null

  return (
    <div className="flex min-h-[132px] flex-1 flex-col gap-2 overflow-y-auto py-1 pr-1">
      {history.map((turn, index) => {
        const isUser = turn.role === "user"

        return (
          <div
            key={`${turn.role}-${index}-${turn.text}`}
            className={cn(
              "flex items-end gap-2",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            {!isUser && (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onPlayCharacter(turn.text)}
                disabled={disabled}
                aria-label="Play role line"
                className="mb-1 rounded-full bg-background shadow-sm"
              >
                <Play className="size-3.5 fill-current" />
              </Button>
            )}
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm",
                isUser
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border bg-background"
              )}
            >
              <div
                className={cn(
                  "mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase",
                  isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {isUser ? (
                  <Mic className="size-3" />
                ) : (
                  <Bot className="size-3" />
                )}
                {isUser ? "You" : "Role"}
              </div>
              <p>{turn.text}</p>
            </div>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}

function formatRecordingDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function PracticeSession({
  character,
  levelIndex,
  onBack,
  backLabel = "Back",
  onContinue,
  continueLabel,
}: PracticeSessionProps) {
  const { languageId, regionId, setLanguageId } = useLanguage()

  const scenario = useMemo(
    () => characterLevelScenario(character, levelIndex, languageId),
    [character, levelIndex, languageId],
  )
  // The language actually practiced: falls back to the scenario's own language
  // when it has no content for the globally selected one.
  const practiceLanguageId = useMemo(
    () => getScenarioFallbackLanguageId(scenario, languageId),
    [scenario, languageId],
  )

  useEffect(() => {
    if (practiceLanguageId !== languageId) {
      setLanguageId(practiceLanguageId)
    }
  }, [languageId, practiceLanguageId, setLanguageId])
  const levelTotal = character.levels.length
  const isOpenMode = scenario.mode === "open"
  const isCoachMode = scenario.mode === "coach"
  const isRoleplayMode = (scenario.mode ?? "roleplay") === "roleplay"

  const showPronunciation = !isOpenMode
  const showMeter =
    isRoleplayMode && Boolean(scenario.meterLabel && scenario.goal)
  const showWordBreakdown = isCoachMode

  const scenarioContent = getScenarioContent(scenario, practiceLanguageId)

  const {
    history,
    meter,
    score,
    goalAchieved,
    busy,
    error,
    submitAudio,
    reset,
    isScoring,
    isSpeaking,
    speakerAnalyser,
    targetPhrase,
    selectedWord,
    speakLine,
    selectWord,
    pickPhrase,
    clearScore,
  } = useConversation({ scenario, languageId: practiceLanguageId, regionId })

  const {
    isRecording,
    analyser: recorderAnalyser,
    error: recorderError,
    recordingDurationMs,
    startRecording,
    stopRecording,
  } = useAudioRecorder({ onAutoStop: submitAudio })

  const chatEndRef = useRef<HTMLDivElement>(null)

  const examples = useMemo<SentenceSuggestion[]>(
    () =>
      isCoachMode
        ? pickRandomSentences(EXAMPLE_COUNT, practiceLanguageId)
        : scenarioContent.starters,
    [isCoachMode, practiceLanguageId, scenarioContent.starters],
  )

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" })
  }, [history.length])

  const hasWon = goalAchieved

  useEffect(() => {
    if (!hasWon) return

    markScenarioCompleted(character.id)

    const fire = (particleRatio: number, options: confetti.Options) => {
      void confetti({
        particleCount: Math.floor(200 * particleRatio),
        spread: 70,
        origin: { y: 0.6 },
        ...options,
      })
    }

    fire(0.25, { spread: 26, startVelocity: 55 })
    fire(0.2, { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1, { spread: 120, startVelocity: 45 })
  }, [hasWon, character.id])

  const displayError = recorderError ?? error
  const isBusy = busy

  const waveformAnalyser = isRecording ? recorderAnalyser : speakerAnalyser
  const waveformActive = isRecording || isSpeaking

  const displayedPhrase = score?.transcript ?? targetPhrase

  const selectedIndex = useMemo(() => {
    if (!score || !selectedWord) return -1
    return score.words.findIndex((w) => w.word === selectedWord.word)
  }, [score, selectedWord])

  async function handleMicPress() {
    if (isBusy || hasWon) return

    if (isRecording) {
      const audio = await stopRecording()
      await submitAudio(audio)
      return
    }

    clearScore()
    await startRecording()
  }

  function handlePlayCharacterTurn(text: string) {
    speakLine(text, isOpenMode ? "coach" : "character")
  }

  const suggestionList = score?.next_sentences.length
    ? score.next_sentences
    : !score
      ? examples
      : []

  const exampleSuggestion = suggestionList[0] ?? null

  return (
    <div className="mx-auto flex h-svh w-full max-w-lg flex-col overflow-hidden px-4 py-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <ScenarioBackButton onBack={onBack} label={backLabel} />
      </div>

      <div className="shrink-0 space-y-2 py-2">
        {levelTotal > 1 ? (
          <LevelStrip levels={character.levels} levelIndex={levelIndex} />
        ) : (
          <div className="space-y-0.5 text-center">
            <h1 className="text-lg font-semibold leading-tight">{scenario.title}</h1>
          </div>
        )}
        <p className="line-clamp-2 text-center text-xs text-muted-foreground">
          {hasWon
            ? scenario.winMessage
            : score?.coaching ??
              (targetPhrase
                ? "Tap the mic when ready"
                : isOpenMode
                  ? "Share what comes to mind"
                  : scenario.tagline)}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        <ScenarioScene
          scenarioId={isBuiltInCharacterId(scenario.id) ? scenario.id : undefined}
          imagePrompt={
            isBuiltInCharacterId(scenario.id) ? undefined : scenario.imagePrompt
          }
          className="h-44 w-full shrink-0 rounded-none"
          overlay
        />

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {showMeter && scenario.meterLabel && scenario.goal && !hasWon && (
            <MeterBar meter={meter} label={scenario.meterLabel} goal={scenario.goal} />
          )}

          {(isRoleplayMode || isOpenMode) && history.length > 0 && (
            <ConversationLog
              history={history}
              onPlayCharacter={handlePlayCharacterTurn}
              disabled={isRecording || isScoring || isSpeaking}
              endRef={chatEndRef}
            />
          )}

          {hasWon && scenario.winMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {scenario.winMessage}
              </p>
              {onContinue ? (
                <Button className="mt-3" size="sm" onClick={onContinue}>
                  {continueLabel ?? "Continue"}
                </Button>
              ) : (
                <Button className="mt-3" size="sm" variant="outline" onClick={reset}>
                  <RotateCcw />
                  Play again
                </Button>
              )}
            </div>
          )}

          {isCoachMode && displayedPhrase && (
            <div className="flex items-center justify-center gap-2 text-center">
              <p className="truncate text-base font-medium">{displayedPhrase}</p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => speakLine(displayedPhrase, "phrase")}
                disabled={isRecording || isScoring}
                aria-label="Hear phrase"
              >
                <Play className="size-4 fill-current" />
              </Button>
            </div>
          )}

          {score && !hasWon && showPronunciation && (
            <div className="flex items-center justify-center gap-3">
              <p className={cn("text-2xl font-semibold tabular-nums", scoreColor(score.overall_score))}>
                {Math.round(score.overall_score)}
              </p>
              {showWordBreakdown && score.words.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {score.words.slice(0, 5).map((word, index) => (
                    <WordChip
                      key={`${word.word}-${index}`}
                      word={word}
                      selected={selectedIndex === index}
                      onSelect={() => selectWord(word)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <Waveform analyser={waveformAnalyser} active={waveformActive} className="h-10 shrink-0" />

          {!hasWon && exampleSuggestion && (
            <ExampleSuggestionCard
              sentence={exampleSuggestion}
              onSelect={() => pickPhrase(exampleSuggestion.text)}
            />
          )}

          {!hasWon && (
            <div className="flex shrink-0 flex-col items-center gap-1">
              <Button
                size="icon-lg"
                className={cn(
                  "size-14 rounded-full shadow-md transition-transform",
                  isRecording && "scale-105 bg-destructive hover:bg-destructive/90",
                )}
                onClick={handleMicPress}
                disabled={isBusy}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isScoring ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : isRecording ? (
                  <Square className="size-5 fill-current" />
                ) : (
                  <Mic className="size-6" />
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {isScoring ? "Analyzing…" : isRecording ? "Tap to stop" : "Tap to speak"}
              </p>
              {isRecording && (
                <p className="text-[10px] tabular-nums text-muted-foreground/70">
                  {formatRecordingDuration(recordingDurationMs)}
                </p>
              )}
            </div>
          )}

          {displayError && (
            <p className="text-center text-xs text-destructive">{displayError}</p>
          )}

          {score && !hasWon && showPronunciation && (
            <Button variant="ghost" size="xs" className="mx-auto" onClick={clearScore}>
              <RotateCcw className="size-3" />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
