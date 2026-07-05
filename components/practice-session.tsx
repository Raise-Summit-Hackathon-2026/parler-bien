"use client"

import confetti from "canvas-confetti"
import {
  AudioLines,
  Bot,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  Square,
  Video,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react"

import { AvatarStage } from "@/components/avatar-stage"
import { useLanguage } from "@/components/language-provider"
import { LevelStrip } from "@/components/level-strip"
import {
  ExampleSuggestionCard,
  MeterBar,
  WordChip,
  scoreColor,
} from "@/components/session-hud"
import { SessionShell } from "@/components/session-shell"
import { Button } from "@/components/ui/button"
import { Waveform } from "@/components/waveform"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useConversation } from "@/hooks/use-conversation"
import { useLiveAvatar } from "@/hooks/use-live-avatar"
import {
  categoryScoresPronunciation,
  characterLevelScenario,
  getScenarioContent,
  getScenarioFallbackLanguageId,
  resolveCharacterGender,
  type Character,
} from "@/lib/character"
import { isBuiltInCharacterId } from "@/lib/characters/index"
import { markScenarioCompleted } from "@/lib/completions"
import { markLevelCompleted } from "@/lib/level-progress"
import { resolveLiveAvatarIdForPractice } from "@/lib/liveavatar"
import {
  getLiveAvatarEnabledPreference,
  setLiveAvatarEnabledPreference,
} from "@/lib/liveavatar-prefs"
import { PROGRESS_LABEL } from "@/lib/meter"
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
  characterName,
  onPlayCharacter,
  disabled,
  endRef,
}: {
  history: ConversationTurn[]
  characterName: string
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
                  isUser
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {isUser ? (
                  <Mic className="size-3" />
                ) : (
                  <Bot className="size-3" />
                )}
                {isUser ? "You" : characterName}
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

function SessionProgressRail({
  activeStep,
}: {
  activeStep: "listen" | "turn" | "feedback" | "improve" | "next"
}) {
  const steps = [
    { id: "listen", label: "Listen" },
    { id: "turn", label: "Your turn" },
    { id: "feedback", label: "Feedback" },
    { id: "improve", label: "Improve" },
    { id: "next", label: "Next" },
  ] as const
  const activeIndex = steps.findIndex((step) => step.id === activeStep)

  return (
    <div className="border-y bg-muted/40 px-5 py-3 dark:border-white/10 dark:bg-[#111318]/95">
      <div className="relative mx-auto grid max-w-3xl grid-cols-5 gap-2">
        <div className="absolute top-2.5 right-[10%] left-[10%] h-px bg-border dark:bg-white/15" />
        <div
          className="absolute top-2.5 left-[10%] h-px bg-lime-300/80 transition-all duration-500"
          style={{
            width:
              activeIndex <= 0
                ? "0%"
                : `${Math.min(80, (activeIndex / (steps.length - 1)) * 80)}%`,
          }}
        />
        {steps.map((step, index) => {
          const active = index === activeIndex
          const complete = index < activeIndex

          return (
            <div key={step.id} className="relative flex flex-col items-center gap-2">
              <span
                className={cn(
                  "z-10 size-5 rounded-full border transition-colors",
                  active
                    ? "border-lime-600 bg-lime-600 shadow-[0_0_18px_rgba(101,163,13,0.25)] dark:border-lime-200 dark:bg-lime-300 dark:shadow-[0_0_18px_rgba(190,242,100,0.45)]"
                    : complete
                      ? "border-lime-600/70 bg-lime-600/70 dark:border-lime-300/70 dark:bg-lime-300/70"
                      : "border-border bg-muted dark:border-white/20 dark:bg-[#2a2d33]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active || complete
                    ? "text-foreground dark:text-white"
                    : "text-muted-foreground dark:text-white/45"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
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
    [character, levelIndex, languageId]
  )
  // The language actually practiced: falls back to the scenario's own language
  // when it has no content for the globally selected one.
  const practiceLanguageId = useMemo(
    () => getScenarioFallbackLanguageId(scenario, languageId),
    [scenario, languageId]
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

  const [avatarEnabled, setAvatarEnabled] = useState(
    getLiveAvatarEnabledPreference
  )
  const [avatarRestartKey, setAvatarRestartKey] = useState(0)

  const genderSeed = `${character.id}:${levelIndex}`

  const baseCharacterGender = useMemo(
    () => resolveCharacterGender(scenario, undefined, genderSeed),
    [scenario, genderSeed]
  )

  const liveAvatarId = useMemo(
    () => resolveLiveAvatarIdForPractice(scenario, baseCharacterGender),
    [scenario, baseCharacterGender]
  )

  const {
    status: liveAvatarStatus,
    isReady: liveAvatarReady,
    isSpeaking: liveAvatarSpeaking,
    error: liveAvatarError,
    attachVideo,
    speakText,
    interrupt: interruptAvatar,
  } = useLiveAvatar({
    avatarId: liveAvatarId,
    languageId: practiceLanguageId,
    enabled: avatarEnabled,
    restartKey: avatarRestartKey,
  })

  // A paused (idle-released) avatar session wakes when the user takes a turn.
  function wakeAvatarIfPaused() {
    if (avatarEnabled && liveAvatarStatus === "paused") {
      setAvatarRestartKey((key) => key + 1)
    }
  }

  const avatarSink = useMemo(
    () =>
      avatarEnabled && liveAvatarReady ? { isReady: true, speakText } : null,
    [avatarEnabled, liveAvatarReady, speakText]
  )

  const {
    history,
    meter,
    score,
    goalAchieved,
    busy,
    error,
    moderationWarning,
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
  // Set while an avatar-mode session is connecting before the opening line —
  // gates the first line on avatar readiness so it never plays via TTS first.
  const [pendingStart, setPendingStart] = useState(false)

  const examples = useMemo<SentenceSuggestion[]>(
    () =>
      isCoachMode
        ? pickRandomSentences(EXAMPLE_COUNT, practiceLanguageId)
        : scenarioContent.starters,
    [isCoachMode, practiceLanguageId, scenarioContent.starters]
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
  }, [hasWon, character.id, character.levels, levelIndex])

  const displayError = recorderError ?? error ?? liveAvatarError
  const isCharacterSpeaking = isSpeaking || liveAvatarSpeaking
  const isBusy = busy || liveAvatarSpeaking

  const waveformAnalyser = isRecording ? recorderAnalyser : speakerAnalyser
  const waveformActive = isRecording || isCharacterSpeaking

  const displayedPhrase = score?.transcript ?? targetPhrase
  // Listen: character talking (opening line / phrase playback), nothing scored.
  // Your turn: recording, or idle with a turn to take.
  // Feedback: analyzing, or the scored reply still being spoken.
  // Improve: score on screen, character done talking — review and retry.
  // Next: goal achieved.
  const activeStep: "listen" | "turn" | "feedback" | "improve" | "next" =
    hasWon
      ? "next"
      : isRecording
        ? "turn"
        : isScoring
          ? "feedback"
          : score
            ? isCharacterSpeaking
              ? "feedback"
              : "improve"
            : isCharacterSpeaking
              ? "listen"
              : conversationStarted || targetPhrase
                ? "turn"
                : "listen"

  const selectedIndex = useMemo(() => {
    if (!score || !selectedWord) return -1
    return score.words.findIndex((w) => w.word === selectedWord.word)
  }, [score, selectedWord])

  useEffect(() => {
    if (!pendingRecord || isCharacterSpeaking) return
    queueMicrotask(() => setPendingRecord(false))
    beginLiveTurn()
    void startRecording()
  }, [pendingRecord, isCharacterSpeaking, beginLiveTurn, startRecording])

  // Play the opening line and hand the turn to the user. In avatar mode this
  // runs only once the session is ready, so the first line uses the avatar
  // (not a TTS fallback that the avatar then "takes over" on turn two).
  const startLiveConversation = useCallback(() => {
    beginLiveTurn()
    startConversation()
    if (scenarioContent.openingLine) {
      setPendingRecord(true)
    } else {
      void startRecording()
    }
  }, [beginLiveTurn, startConversation, scenarioContent.openingLine, startRecording])

  // Fire the deferred avatar-mode start once the session is ready, or fall
  // back to voice if it errors or hangs — never leave the user on a spinner.
  useEffect(() => {
    if (!pendingStart) return
    const proceed = () => {
      setPendingStart(false)
      startLiveConversation()
    }
    if (liveAvatarStatus === "ready" || liveAvatarStatus === "error") {
      queueMicrotask(proceed)
      return
    }
    // Safety net: don't leave the user on a spinner if connecting hangs.
    const timer = setTimeout(proceed, 8000)
    return () => clearTimeout(timer)
  }, [pendingStart, liveAvatarStatus, startLiveConversation])

  function handleChooseMode(mode: "avatar" | "voice") {
    const wantAvatar = mode === "avatar"
    setAvatarEnabled(wantAvatar)
    setLiveAvatarEnabledPreference(wantAvatar)
    if (wantAvatar && liveAvatarStatus !== "ready") {
      // Wait for the session to connect before the opening line plays.
      setPendingStart(true)
      return
    }
    startLiveConversation()
  }

  async function handleLiveConversationPress() {
    if (hasWon) return
    if (isBusy && !isRecording) return

    wakeAvatarIfPaused()

    if (isRecording) {
      const audio = await stopRecording()
      await submitAudio(audio)
      setPendingRecord(true)
      return
    }

    await startRecording()
  }

  async function handleCoachMicPress() {
    if (isBusy || hasWon) return

    wakeAvatarIfPaused()

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
  const liveHint =
    isLiveConversation && suggestionList[0] ? suggestionList[0] : null
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
      <div className="shrink-0 space-y-1 pb-4 pt-1 text-center">
        {showLevelStrip && levelTotal > 1 ? (
          <LevelStrip levels={character.levels} levelIndex={levelIndex} />
        ) : !showLevelStrip && levelTotal > 1 ? (
          <div className="space-y-1 text-center">
            <p className="text-xs font-medium text-lime-700 dark:text-lime-300/85">
              Level {levelIndex + 1} · {character.levels[levelIndex]?.title}
            </p>
          </div>
        ) : (
          <div className="space-y-1 text-center">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              {scenario.title}
            </h1>
          </div>
        )}
        {levelTotal > 1 && (
            <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {scenario.title}
          </h1>
        )}
        <p className="mx-auto line-clamp-2 max-w-2xl text-sm text-muted-foreground dark:text-white/60">
          {hasWon
            ? scenario.winMessage
            : (score?.coaching ??
              (isLiveConversation
                ? conversationStarted
                  ? isRecording
                    ? "Listening…"
                    : "Tap to reply"
                  : pendingStart
                    ? "Connecting your avatar…"
                    : "How would you like to practice?"
                : targetPhrase
                  ? "Tap the mic when ready"
                  : isOpenMode
                    ? "Share what comes to mind"
                    : scenario.tagline))}
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl shadow-black/10 ring-1 ring-border/50 dark:border-white/10 dark:bg-[#16181d]/95 dark:text-white dark:shadow-black/50 dark:ring-white/5">
        <AvatarStage
          status={liveAvatarStatus}
          attachVideo={attachVideo}
          avatarEnabled={avatarEnabled}
          onToggleAvatar={handleToggleAvatar}
          onRestart={() => setAvatarRestartKey((key) => key + 1)}
          scenarioId={builtInCharacter ? character.id : undefined}
          imagePrompt={builtInCharacter ? undefined : character.avatarPrompt}
          className="aspect-3/1 max-h-56 w-full shrink-0 rounded-none"
          overlay
        />

        <SessionProgressRail activeStep={activeStep} />

        <div className="flex flex-col p-4 sm:p-5">
          <div className="space-y-3">
            {showMeter && scenario.goal && !hasWon && (
              <div className="rounded-xl border bg-muted/30 p-3 dark:border-white/10 dark:bg-white/3">
                <MeterBar
                  meter={meter}
                  label={PROGRESS_LABEL}
                  goal={scenario.goal}
                />
              </div>
            )}

            {(isRoleplayMode || isOpenMode) && history.length > 0 && (
              <ConversationLog
                history={history}
                characterName={scenario.characterName ?? character.name}
                onPlayCharacter={handlePlayCharacterTurn}
                disabled={isRecording || isScoring || isCharacterSpeaking}
                endRef={chatEndRef}
              />
            )}

            {hasWon && scenario.winMessage && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {scenario.winMessage}
                </p>
                {onContinue ? (
                  <Button className="mt-2" size="sm" onClick={onContinue}>
                    {continueLabel ?? "Continue"}
                  </Button>
                ) : (
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="outline"
                    onClick={reset}
                  >
                    <RotateCcw />
                    Play again
                  </Button>
                )}
              </div>
            )}

            {isCoachMode && displayedPhrase && (
              <div className="rounded-xl border border-lime-600/20 bg-lime-600/5 p-4 shadow-inner shadow-black/5 dark:border-lime-300/20 dark:bg-white/3 dark:shadow-black/20">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-lime-700 uppercase dark:text-lime-300/80">
                  Try saying
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {displayedPhrase}
                    </p>
                    {targetPhrase && (
                      <p className="mt-1 text-sm text-muted-foreground dark:text-white/50">
                        {scenarioContent.openingLine?.hint}
                      </p>
                    )}
                  </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => speakLine(displayedPhrase, "phrase")}
                  disabled={isRecording || isScoring}
                  aria-label="Hear phrase"
                  className="shrink-0 hover:bg-muted dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Play className="size-4 fill-current" />
                </Button>
                </div>
              </div>
            )}

            {score && !hasWon && showPronunciation && (
              <div className="flex items-center justify-center gap-3">
                <p
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    scoreColor(score.overall_score)
                  )}
                >
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

          <div className="shrink-0 space-y-3 pt-4">
            <Waveform
              analyser={waveformAnalyser}
              active={waveformActive}
              className="mx-auto h-12 shrink-0"
            />

            {!hasWon && exampleSuggestion && (
              <ExampleSuggestionCard
                sentence={exampleSuggestion}
                onSelect={() =>
                  pickPhrase(exampleSuggestion.text, { speak: true })
                }
              />
            )}

            {!hasWon && liveHint && (
              <p className="rounded-lg border bg-muted/30 px-2.5 py-2 text-center text-xs text-muted-foreground dark:border-white/10 dark:bg-white/4 dark:text-white/55">
                <span className="font-medium text-foreground/80 dark:text-white/80">Ideas: </span>
                {liveHint.text}
              </p>
            )}

            {!hasWon && (
              <div className="flex shrink-0 flex-col items-center gap-2">
                {isLiveConversation ? (
                  !conversationStarted ? (
                    pendingStart ? (
                      <>
                        <Button
                          size="lg"
                          disabled
                          className="h-14 min-w-48 rounded-full px-7"
                        >
                          <Loader2 className="size-4 animate-spin" />
                          Connecting avatar…
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingStart(false)
                            handleChooseMode("voice")
                          }}
                          className="text-[11px] text-muted-foreground underline underline-offset-2 dark:text-white/50"
                        >
                          Start with voice instead
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <Button
                          size="lg"
                          className="h-14 rounded-full px-6 shadow-[0_0_28px_rgba(190,242,100,0.22)]"
                          onClick={() => handleChooseMode("avatar")}
                        >
                          <Video className="size-4" />
                          Video avatar
                        </Button>
                        <Button
                          size="lg"
                          variant="secondary"
                          className="h-14 rounded-full px-6"
                          onClick={() => handleChooseMode("voice")}
                        >
                          <AudioLines className="size-4" />
                          Voice only
                        </Button>
                      </div>
                    )
                  ) : (
                    <Button
                      size="lg"
                      className={cn(
                        "h-14 min-w-48 rounded-full px-7 shadow-[0_0_28px_rgba(190,242,100,0.22)] transition-transform",
                        isRecording && "bg-destructive hover:bg-destructive/90"
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
                      ) : (
                        <>
                          <Mic className="size-4" />
                          Reply
                        </>
                      )}
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      size="icon-lg"
                      className={cn(
                        "size-16 rounded-full shadow-[0_0_32px_rgba(190,242,100,0.26)] transition-transform",
                        isRecording &&
                          "scale-105 bg-destructive hover:bg-destructive/90"
                      )}
                      onClick={handleCoachMicPress}
                      disabled={isBusy}
                      aria-label={
                        isRecording ? "Stop recording" : "Start recording"
                      }
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
                      {isScoring
                        ? "Analyzing…"
                        : isRecording
                          ? "Tap to stop"
                          : "Tap to speak"}
                    </p>
                  </>
                )}
                {isLiveConversation && (
                  <p className="text-[11px] text-muted-foreground dark:text-white/45">
                    {isScoring
                      ? "Analyzing…"
                      : isRecording
                        ? "Tap when you're done speaking"
                        : !conversationStarted
                          ? pendingStart
                            ? "Getting the avatar ready — it speaks first"
                            : "Video shows a face; voice is audio only. The character speaks first."
                          : "Speak naturally — no script"}
                  </p>
                )}
                {isRecording && (
                  <p className="text-[10px] text-muted-foreground/80 tabular-nums dark:text-white/40">
                    {formatRecordingDuration(recordingDurationMs)}
                  </p>
                )}
              </div>
            )}

            {moderationWarning && (
              <div className="flex items-center gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5">
                <ShieldAlert
                  className="size-4 shrink-0 text-[#76b900]"
                  aria-hidden
                />
                <div className="text-xs leading-snug">
                  <p className="font-medium text-destructive">
                    {moderationWarning}
                  </p>
                  <p className="text-muted-foreground">
                    Flagged by{" "}
                    <span className="font-medium text-foreground/90">
                      NVIDIA Nemotron
                    </span>{" "}
                    content safety.
                  </p>
                </div>
              </div>
            )}

            {displayError && (
              <p className="text-center text-xs text-destructive">
                {displayError}
              </p>
            )}

            {score && !hasWon && showPronunciation && (
              <Button
                variant="ghost"
                size="xs"
                className="mx-auto"
                onClick={clearScore}
              >
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
