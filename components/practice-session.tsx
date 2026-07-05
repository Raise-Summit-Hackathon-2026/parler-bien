"use client"

import confetti from "canvas-confetti"
import { Bot, Loader2, MessageCircle, Mic, Play, RotateCcw, Send, Square } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type RefObject } from "react"

import { AvatarStage } from "@/components/avatar-stage"
import { LevelStrip } from "@/components/level-strip"
import { useLanguage } from "@/components/language-provider"
import { SessionShell } from "@/components/session-shell"
import {
  ExampleSuggestionCard,
  MeterBar,
  WordChip,
  scoreColor,
} from "@/components/session-hud"
import { PROGRESS_LABEL } from "@/lib/meter"
import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useConversation } from "@/hooks/use-conversation"
import { useLiveAvatar } from "@/hooks/use-live-avatar"
import {
  characterLevelScenario,
  categoryScoresPronunciation,
  getScenarioContent,
  getScenarioFallbackLanguageId,
  resolveCharacterGender,
  type Character,
} from "@/lib/character"
import { isBuiltInCharacterId } from "@/lib/characters/index"
import { markScenarioCompleted } from "@/lib/completions"
import { markLevelCompleted } from "@/lib/level-progress"
import {
  getLiveAvatarEnabledPreference,
  setLiveAvatarEnabledPreference,
} from "@/lib/liveavatar-prefs"
import { resolveLiveAvatarIdForPractice } from "@/lib/liveavatar"
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
  /** Hide inline level strip when using the track path screen */
  showLevelStrip?: boolean
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
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto py-0.5 pr-1">
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
                "max-w-[82%] rounded-xl px-3 py-2 text-[15px] leading-snug shadow-sm",
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
  showLevelStrip = true,
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

  const scoresPronunciation = categoryScoresPronunciation(character.category)
  const isLiveConversation = isRoleplayMode || isOpenMode
  const showPronunciation = scoresPronunciation && !isOpenMode
  const showMeter = isRoleplayMode && Boolean(scenario.goal)
  const showWordBreakdown = scoresPronunciation && isCoachMode

  const scenarioContent = getScenarioContent(scenario, practiceLanguageId)

  const [avatarEnabled, setAvatarEnabled] = useState(getLiveAvatarEnabledPreference)
  const [avatarRestartKey, setAvatarRestartKey] = useState(0)

  const genderSeed = `${character.id}:${levelIndex}`

  const baseCharacterGender = useMemo(
    () => resolveCharacterGender(scenario, undefined, genderSeed),
    [scenario, genderSeed],
  )

  const liveAvatarId = useMemo(
    () => resolveLiveAvatarIdForPractice(scenario, baseCharacterGender),
    [scenario, baseCharacterGender],
  )

  const {
    status: liveAvatarStatus,
    isReady: liveAvatarReady,
    isSpeaking: liveAvatarSpeaking,
    error: liveAvatarError,
    remainingSeconds: liveAvatarRemaining,
    attachVideo,
    speakText,
    interrupt: interruptAvatar,
  } = useLiveAvatar({
    avatarId: liveAvatarId,
    languageId: practiceLanguageId,
    enabled: avatarEnabled,
    restartKey: avatarRestartKey,
  })

  const avatarSink = useMemo(
    () =>
      avatarEnabled && liveAvatarReady
        ? { isReady: true, speakText }
        : null,
    [avatarEnabled, liveAvatarReady, speakText],
  )

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
    stopSpeaking,
    selectWord,
    pickPhrase,
    clearScore,
    beginLiveTurn,
    startConversation,
    conversationStarted,
  } = useConversation({
    scenario,
    languageId: practiceLanguageId,
    regionId,
    avatarSink,
    interruptAvatar,
    genderSeed,
  })

  const {
    isRecording,
    analyser: recorderAnalyser,
    error: recorderError,
    recordingDurationMs,
    startRecording,
    stopRecording,
  } = useAudioRecorder({ onAutoStop: submitAudio })

  const chatEndRef = useRef<HTMLDivElement>(null)
  const [pendingRecord, setPendingRecord] = useState(false)

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
    const level = character.levels[levelIndex]
    if (level) markLevelCompleted(character.id, level.id)

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

  const displayError = recorderError ?? error ?? liveAvatarError
  const isCharacterSpeaking = isSpeaking || liveAvatarSpeaking
  const isBusy = busy || liveAvatarSpeaking

  const waveformAnalyser = isRecording ? recorderAnalyser : speakerAnalyser
  const waveformActive = isRecording || isCharacterSpeaking

  const displayedPhrase = score?.transcript ?? targetPhrase

  const selectedIndex = useMemo(() => {
    if (!score || !selectedWord) return -1
    return score.words.findIndex((w) => w.word === selectedWord.word)
  }, [score, selectedWord])

  useEffect(() => {
    if (!pendingRecord || isCharacterSpeaking) return
    setPendingRecord(false)
    beginLiveTurn()
    void startRecording()
  }, [pendingRecord, isCharacterSpeaking, beginLiveTurn, startRecording])

  async function handleLiveConversationPress() {
    if (hasWon) return
    if (isBusy && !isRecording) return

    if (isRecording) {
      const audio = await stopRecording()
      await submitAudio(audio)
      setPendingRecord(true)
      return
    }

    beginLiveTurn()

    if (!conversationStarted) {
      startConversation()
      if (scenarioContent.openingLine) {
        setPendingRecord(true)
      } else {
        await startRecording()
      }
      return
    }

    await startRecording()
  }

  async function handleCoachMicPress() {
    if (isBusy || hasWon) return

    if (isRecording) {
      const audio = await stopRecording()
      await submitAudio(audio)
      return
    }

    stopSpeaking()
    interruptAvatar?.()
    clearScore()
    await startRecording()
  }

  function handlePlayCharacterTurn(text: string) {
    speakLine(text, isOpenMode ? "coach" : "character")
  }

  const suggestionList = score?.next_sentences.length
    ? score.next_sentences
    : !score && isCoachMode
      ? examples
      : []

  const exampleSuggestion = isCoachMode ? (suggestionList[0] ?? null) : null
  const liveHint = isLiveConversation && suggestionList[0] ? suggestionList[0] : null
  const builtInCharacter = isBuiltInCharacterId(character.id)

  function handleToggleAvatar(next: boolean) {
    setAvatarEnabled(next)
    setLiveAvatarEnabledPreference(next)
    if (!next) {
      interruptAvatar()
    }
  }

  return (
    <SessionShell onBack={onBack} backLabel={backLabel}>
      <div className="shrink-0 space-y-1 py-1.5">
        {showLevelStrip && levelTotal > 1 ? (
          <LevelStrip levels={character.levels} levelIndex={levelIndex} />
        ) : !showLevelStrip && levelTotal > 1 ? (
          <div className="space-y-0.5 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              Level {levelIndex + 1} · {character.levels[levelIndex]?.title}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 text-center">
            <h1 className="text-lg font-semibold leading-tight">{scenario.title}</h1>
          </div>
        )}
        <p className="line-clamp-2 text-center text-xs text-muted-foreground">
          {hasWon
            ? scenario.winMessage
            : score?.coaching ??
              (isLiveConversation
                ? conversationStarted
                  ? isRecording
                    ? "Listening…"
                    : "Tap to reply"
                  : "Press start when you're ready to speak"
                : targetPhrase
                  ? "Tap the mic when ready"
                  : isOpenMode
                    ? "Share what comes to mind"
                    : scenario.tagline)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        <AvatarStage
          status={liveAvatarStatus}
          attachVideo={attachVideo}
          remainingSeconds={liveAvatarRemaining}
          avatarEnabled={avatarEnabled}
          onToggleAvatar={handleToggleAvatar}
          onRestart={() => setAvatarRestartKey((key) => key + 1)}
          scenarioId={builtInCharacter ? character.id : undefined}
          imagePrompt={builtInCharacter ? undefined : character.avatarPrompt}
          className="aspect-[2/1] max-h-44 w-full shrink-0 rounded-none"
          overlay
        />

        <div className="flex flex-col p-3.5 sm:p-5">
          <div className="space-y-1.5">
            {showMeter && scenario.goal && !hasWon && (
              <MeterBar meter={meter} label={PROGRESS_LABEL} goal={scenario.goal} />
            )}

            {(isRoleplayMode || isOpenMode) && history.length > 0 && (
              <ConversationLog
                history={history}
                onPlayCharacter={handlePlayCharacterTurn}
                disabled={isRecording || isScoring || isCharacterSpeaking}
                endRef={chatEndRef}
              />
            )}

            {hasWon && scenario.winMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {scenario.winMessage}
                </p>
                {onContinue ? (
                  <Button className="mt-2" size="sm" onClick={onContinue}>
                    {continueLabel ?? "Continue"}
                  </Button>
                ) : (
                  <Button className="mt-2" size="sm" variant="outline" onClick={reset}>
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
          </div>

          <div className="shrink-0 space-y-1.5 border-t border-border/60 pt-2">
            <Waveform analyser={waveformAnalyser} active={waveformActive} className="h-10 shrink-0" />

            {!hasWon && exampleSuggestion && (
              <ExampleSuggestionCard
                sentence={exampleSuggestion}
                onSelect={() => pickPhrase(exampleSuggestion.text, { speak: true })}
              />
            )}

            {!hasWon && liveHint && (
              <p className="rounded-lg bg-muted/40 px-2.5 py-2 text-center text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Ideas: </span>
                {liveHint.text}
              </p>
            )}

            {!hasWon && (
              <div className="flex shrink-0 flex-col items-center gap-1">
                {isLiveConversation ? (
                  <Button
                    size="lg"
                    className={cn(
                      "h-11 min-w-[11rem] rounded-full px-6 shadow-md transition-transform",
                      isRecording && "bg-destructive hover:bg-destructive/90",
                    )}
                    onClick={handleLiveConversationPress}
                    disabled={isBusy && !isRecording}
                  >
                    {isScoring ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Analyzing…
                      </>
                    ) : isRecording ? (
                      <>
                        <Send className="size-4" />
                        Send reply
                      </>
                    ) : !conversationStarted ? (
                      <>
                        <MessageCircle className="size-4" />
                        Start conversation
                      </>
                    ) : (
                      <>
                        <Mic className="size-4" />
                        Reply
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      size="icon-lg"
                      className={cn(
                        "size-12 rounded-full shadow-md transition-transform",
                        isRecording && "scale-105 bg-destructive hover:bg-destructive/90",
                      )}
                      onClick={handleCoachMicPress}
                      disabled={isBusy}
                      aria-label={isRecording ? "Stop recording" : "Start recording"}
                    >
                      {isScoring ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : isRecording ? (
                        <Square className="size-4 fill-current" />
                      ) : (
                        <Mic className="size-5" />
                      )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      {isScoring ? "Analyzing…" : isRecording ? "Tap to stop" : "Tap to speak"}
                    </p>
                  </>
                )}
                {isLiveConversation && (
                  <p className="text-[11px] text-muted-foreground">
                    {isScoring
                      ? "Analyzing…"
                      : isRecording
                        ? "Tap when you're done speaking"
                        : !conversationStarted
                          ? "Character speaks first, then you"
                          : "Speak naturally — no script"}
                  </p>
                )}
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
    </SessionShell>
  )
}
