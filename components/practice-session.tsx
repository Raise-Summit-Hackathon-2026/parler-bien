"use client"

import confetti from "canvas-confetti"
import { Loader2, Mic, RotateCcw, Square, Volume2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useLanguage } from "@/components/language-provider"
import { LanguagePicker } from "@/components/language-picker"
import { AvatarStage } from "@/components/avatar-stage"
import { ScenarioBackButton } from "@/components/scenario-picker"
import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useLiveAvatar } from "@/hooks/use-live-avatar"
import { useSpeaker } from "@/hooks/use-speaker"
import { markScenarioCompleted } from "@/lib/completions"
import { hasCapability } from "@/lib/agents"
import type { LevelContext } from "@/lib/level-scenario"
import { resolveMeterUpdate } from "@/lib/meter"
import { resolveLiveAvatarIdForScenario } from "@/lib/liveavatar"
import {
  markLevelCompleted,
  markLevelInProgress,
} from "@/lib/workspace-progress"
import { countPlayableLevels } from "@/lib/workspace-types"
import { pickRandomSentences } from "@/lib/sentences"
import { authenticatedFetch } from "@/lib/supabase"
import {
  getScenarioContent,
  isBuiltInScenarioId,
  isCustomScenarioId,
  randomCharacterGender,
  resolveCharacterGender,
  resolveCharacterVoice,
  type CharacterGender,
  type Scenario,
} from "@/lib/scenarios"
import { getRegion } from "@/lib/languages"
import type {
  CharacterReply,
  ConversationTurn,
  PronunciationScore,
  SentenceSuggestion,
  SpeakerProfile,
  WordScore,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const EXAMPLE_COUNT = 4

type PracticeSessionProps = {
  scenario: Scenario
  onBack: () => void
  levelContext?: LevelContext
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10 ring-emerald-500/20"
  if (score >= 60) return "bg-amber-500/10 ring-amber-500/20"
  return "bg-rose-500/10 ring-rose-500/20"
}

function meterColor(meter: number) {
  if (meter >= 80) return "bg-emerald-500"
  if (meter >= 50) return "bg-amber-500"
  return "bg-rose-500"
}

function WordChip({
  word,
  selected,
  onSelect,
}: {
  word: WordScore
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-lg font-medium ring-1 transition-all",
        scoreBg(word.score),
        scoreColor(word.score),
        selected && "ring-2 ring-foreground/30"
      )}
    >
      <Volume2 className="size-3.5 opacity-60" />
      {word.word}
    </button>
  )
}

function SentenceChip({
  sentence,
  onSelect,
  compact = false,
}: {
  sentence: SentenceSuggestion
  onSelect: () => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="shrink-0 max-w-[min(72vw,220px)] rounded-xl border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/60"
      >
        <p className="truncate text-sm font-medium">{sentence.text}</p>
        <p className="truncate text-[10px] text-muted-foreground">{sentence.hint}</p>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full rounded-2xl border bg-background p-3 text-left transition-colors hover:bg-muted/60"
    >
      <p className="font-medium">{sentence.text}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sentence.hint}</p>
    </button>
  )
}

function PhraseRail({
  sentences,
  onSelect,
}: {
  sentences: SentenceSuggestion[]
  onSelect: (sentence: SentenceSuggestion) => void
}) {
  if (sentences.length === 0) return null

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none [&::-webkit-scrollbar]:hidden">
      {sentences.map((sentence, index) => (
        <SentenceChip
          key={`${sentence.text}-${index}`}
          sentence={sentence}
          compact
          onSelect={() => onSelect(sentence)}
        />
      ))}
    </div>
  )
}

function MeterBar({
  meter,
  label,
  goal,
}: {
  meter: number
  label: string
  goal: string
}) {
  const clamped = Math.max(0, Math.min(100, meter))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{clamped}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            meterColor(clamped)
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Goal: {goal}</p>
    </div>
  )
}

function ReplyBubble({
  reply,
  onHear,
  disabled,
}: {
  reply: CharacterReply
  onHear: () => void
  disabled: boolean
}) {
  return (
    <div className="rounded-2xl border bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Character
          </p>
          <p className="mt-1 font-medium">{reply.text}</p>
          <p className="mt-1 text-sm text-muted-foreground">{reply.hint}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onHear}
          disabled={disabled}
          aria-label="Hear reply"
        >
          <Volume2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function replySpeechText(reply: CharacterReply) {
  return reply.tts_text.trim() || reply.text
}

function randomCharacterGenderForScenario(
  _scenarioId: string
): CharacterGender {
  void _scenarioId
  return randomCharacterGender()
}

export function PracticeSession({
  scenario,
  onBack,
  levelContext,
}: PracticeSessionProps) {
  const { languageId, regionId, setLanguageId, setRegionId } = useLanguage()
  const agent = levelContext?.agent
  const isLanguageMode =
    levelContext?.agent.type === "language" || scenario.id === "teacher"
  const isSpiritualMode = levelContext?.agent.type === "spiritual"
  const isRoleplayMode =
    levelContext?.agent.type === "roleplay" ||
    (!isLanguageMode && !isSpiritualMode && scenario.id !== "teacher")
  const isTeacher = isLanguageMode && !levelContext
  const showPronunciation =
    !levelContext ||
    (agent && hasCapability(agent, "pronunciation_score"))
  const showMeter =
    !isSpiritualMode &&
    (levelContext
      ? agent && hasCapability(agent, "goal_meter")
      : !isTeacher && Boolean(scenario.meterLabel && scenario.goal))
  const showWordBreakdown =
    !isSpiritualMode &&
    (levelContext
      ? agent && hasCapability(agent, "word_breakdown")
      : isTeacher || isLanguageMode)

  const levelOrder = levelContext?.level.position
  const playableTotal = levelContext
    ? countPlayableLevels(levelContext.trackLevels)
    : 0

  const initialTarget =
    levelContext?.level.room.targetPhrase ?? null
  const region = getRegion(languageId, regionId)
  const scenarioContent = getScenarioContent(scenario, languageId)

  const {
    isRecording,
    analyser: recorderAnalyser,
    error,
    startRecording,
    stopRecording,
  } = useAudioRecorder()
  const {
    isSpeaking,
    analyser: speakerAnalyser,
    speak,
    stop: stopSpeaking,
  } = useSpeaker()

  const openingPlayed = useRef(false)

  const [examples] = useState<SentenceSuggestion[]>(() =>
    isTeacher
      ? pickRandomSentences(EXAMPLE_COUNT, languageId)
      : scenarioContent.starters
  )

  useEffect(() => {
    if (!levelContext) return
    void markLevelInProgress(levelContext.levelId)
  }, [levelContext])

  function checkLevelWin(result: PronunciationScore): boolean {
    if (!levelContext) return false

    const { passCriteria } = levelContext

    switch (passCriteria.type) {
      case "pronunciation":
        return result.overall_score >= passCriteria.minScore
      case "goal":
        return result.goal_achieved || result.meter >= 95
      case "complete":
        return userTurnCount + 1 >= passCriteria.minTurns
      default:
        return false
    }
  }
  const [targetPhrase, setTargetPhrase] = useState<string | null>(initialTarget)
  const [userTurnCount, setUserTurnCount] = useState(0)
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [meter, setMeter] = useState(0)
  const [hasWon, setHasWon] = useState(false)
  const [lastSpeaker, setLastSpeaker] = useState<SpeakerProfile | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [selectedWord, setSelectedWord] = useState<WordScore | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const randomScenarioGender = useMemo(
    () => randomCharacterGenderForScenario(scenario.id),
    [scenario.id]
  )

  const characterGender: CharacterGender = resolveCharacterGender(
    scenario,
    lastSpeaker?.gender ?? score?.speaker.gender,
    randomScenarioGender
  )

  const liveAvatarId = useMemo(
    () =>
      resolveLiveAvatarIdForScenario(
        levelContext?.agent ?? null,
        characterGender,
        scenario.id,
        levelContext?.level.room.liveAvatarId,
      ),
    [
      levelContext?.agent,
      levelContext?.level.room.liveAvatarId,
      characterGender,
      scenario.id,
    ],
  )

  const {
    status: liveAvatarStatus,
    isReady: liveAvatarReady,
    isSpeaking: liveAvatarSpeaking,
    error: liveAvatarError,
    remainingSeconds: liveAvatarRemaining,
    attachVideo,
    speak: speakWithAvatar,
    interrupt: interruptAvatar,
  } = useLiveAvatar({
    avatarId: liveAvatarId,
    agentId: levelContext?.agent.id,
    languageId,
    enabled: true,
  })

  const displayError = error ?? requestError ?? liveAvatarError
  const isCharacterSpeaking = isSpeaking || liveAvatarSpeaking
  const isBusy = isScoring || isCharacterSpeaking

  const waveformAnalyser = isRecording ? recorderAnalyser : speakerAnalyser
  const waveformActive = isRecording || isCharacterSpeaking

  const displayedPhrase = score?.transcript ?? targetPhrase

  const selectedIndex = useMemo(() => {
    if (!score || !selectedWord) return -1
    return score.words.findIndex((w) => w.word === selectedWord.word)
  }, [score, selectedWord])

  const speakCharacterLine = useCallback(
    (
      text: string,
      style: "coach" | "character" | "phrase" | "word",
      speaker?: SpeakerProfile | null
    ) => {
      void (async () => {
        if (liveAvatarReady) {
          const spoke = await speakWithAvatar(text)
          if (spoke) return
        }

        const gender = resolveCharacterGender(
          scenario,
          speaker?.gender,
          randomScenarioGender
        )
        const voice = resolveCharacterVoice(scenario, gender)
        const ageRange =
          scenario.id === "parisian" && speaker?.age_range
            ? speaker.age_range
            : scenario.voice.ageRange
        void speak(text, style, {
          gender,
          voice,
          ageRange,
          tone: scenario.voice.tone,
          accent: region.accent,
          deliveryStyle: levelContext?.agent.deliveryStyle,
        })
      })()
    },
    [
      scenario,
      randomScenarioGender,
      region.accent,
      speak,
      levelContext?.agent.deliveryStyle,
      liveAvatarReady,
      speakWithAvatar,
    ],
  )

  useEffect(() => {
    if (isTeacher || !scenarioContent.openingLine || openingPlayed.current)
      return

    openingPlayed.current = true
    setHistory([{ role: "character", text: scenarioContent.openingLine.text }])
    speakCharacterLine(
      scenarioContent.openingLine.text,
      isSpiritualMode ? "coach" : "character",
    )
  }, [isTeacher, isSpiritualMode, scenarioContent.openingLine, speakCharacterLine])

  useEffect(() => {
    if (!hasWon) return

    if (levelContext) {
      void markLevelCompleted(
        levelContext.levelId,
        levelContext.trackLevels,
        score?.overall_score,
      )
      levelContext.onLevelComplete()
    } else {
      markScenarioCompleted(scenario.id)
    }

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
  }, [hasWon, scenario.id, levelContext, score?.overall_score])

  async function handleMicPress() {
    if (isBusy || hasWon) return

    if (isRecording) {
      setRequestError(null)
      setIsScoring(true)

      const audio = await stopRecording()
      if (!audio) {
        setIsScoring(false)
        setRequestError("No audio captured. Try again.")
        return
      }

      try {
        const response = await authenticatedFetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: audio.base64,
            audioFormat: audio.format,
            phrase: targetPhrase ?? undefined,
            languageId,
            regionId,
            scenarioId: scenario.id,
            customScenario: isCustomScenarioId(scenario.id)
              ? scenario
              : undefined,
            history,
            characterGender,
            currentMeter: meter,
            agentType: levelContext?.agent.type,
            agent: levelContext?.agent,
            levelRoom: levelContext?.level.room,
          }),
        })

        if (!response.ok) {
          const data = (await response.json()) as { error?: string }
          throw new Error(data.error ?? "Scoring failed")
        }

        const result = (await response.json()) as PronunciationScore
        setScore(result)
        setTargetPhrase(result.transcript)
        setLastSpeaker(result.speaker)
        setSelectedWord(
          result.words.find((w) => w.score < 80) ?? result.words[0]
        )

        if (isRoleplayMode) {
          const nextMeter = resolveMeterUpdate(meter, result)
          setMeter(nextMeter)
          const won = levelContext
            ? checkLevelWin({ ...result, meter: nextMeter })
            : result.goal_achieved || nextMeter >= 100
          setHasWon(won)
          setHistory((prev) => [
            ...prev,
            { role: "user", text: result.transcript },
            { role: "character", text: result.reply.text },
          ])
          speakCharacterLine(replySpeechText(result.reply), "character", result.speaker)
        } else if (isSpiritualMode) {
          const nextTurnCount = userTurnCount + 1
          setUserTurnCount(nextTurnCount)
          setHistory((prev) => [
            ...prev,
            { role: "user", text: result.transcript },
            { role: "character", text: result.reply.text },
          ])
          const won =
            levelContext &&
            levelContext.passCriteria.type === "complete" &&
            nextTurnCount >= levelContext.passCriteria.minTurns
          setHasWon(Boolean(won))
          speakCharacterLine(replySpeechText(result.reply), "coach", result.speaker)
        } else if (isLanguageMode) {
          const won = levelContext ? checkLevelWin(result) : false
          setHasWon(won)
          speakCharacterLine(replySpeechText(result.reply), "coach", result.speaker)
        } else {
          speakCharacterLine(
            replySpeechText(result.reply),
            "coach",
            result.speaker
          )
        }
      } catch (err) {
        setRequestError(
          err instanceof Error ? err.message : "Something went wrong"
        )
      } finally {
        setIsScoring(false)
      }
      return
    }

    stopSpeaking()
    interruptAvatar()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    await startRecording()
  }

  function handleReset() {
    stopSpeaking()
    interruptAvatar()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
  }

  function handleReplayScenario() {
    stopSpeaking()
    interruptAvatar()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    setTargetPhrase(null)
    setMeter(0)
    setHasWon(false)
    setLastSpeaker(null)
    setUserTurnCount(0)
    setTargetPhrase(initialTarget)

    if (scenarioContent.openingLine) {
      setHistory([
        { role: "character", text: scenarioContent.openingLine.text },
      ])
      speakCharacterLine(scenarioContent.openingLine.text, "character")
    } else {
      setHistory([])
    }
  }

  function handleWordSelect(word: WordScore) {
    setSelectedWord(word)
    speakCharacterLine(word.word, "word")
  }

  function handleHearPhrase(phrase: string) {
    speakCharacterLine(phrase, "phrase")
  }

  function handleSelectExample(sentence: SentenceSuggestion) {
    stopSpeaking()
    interruptAvatar()
    setTargetPhrase(sentence.text)
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    speakCharacterLine(sentence.text, "phrase")
  }

  function handleSelectNext(sentence: SentenceSuggestion) {
    stopSpeaking()
    interruptAvatar()
    setTargetPhrase(sentence.text)
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    speakCharacterLine(sentence.text, "phrase")
  }

  const suggestionList = score?.next_sentences.length
    ? score.next_sentences
    : !score
      ? examples
      : []

  const compactPhrases = suggestionList.slice(0, 3)

  return (
    <div className="mx-auto flex h-svh w-full max-w-lg flex-col overflow-hidden px-4 py-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <ScenarioBackButton onBack={onBack} label={levelContext ? "Path" : "Back"} />
        {levelContext && levelOrder && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {levelOrder}/{playableTotal}
          </span>
        )}
      </div>

      <div className="shrink-0 space-y-0.5 py-2 text-center">
        <h1 className="text-lg font-semibold leading-tight">{scenario.title}</h1>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {hasWon
            ? scenario.winMessage
            : score?.coaching ??
              (targetPhrase
                ? "Tap the mic when ready"
                : isSpiritualMode
                  ? "Share what comes to mind"
                  : scenario.tagline)}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        <AvatarStage
          status={liveAvatarStatus}
          attachVideo={attachVideo}
          remainingSeconds={liveAvatarRemaining}
          scenarioId={isBuiltInScenarioId(scenario.id) ? scenario.id : undefined}
          imagePrompt={isBuiltInScenarioId(scenario.id) ? undefined : scenario.imagePrompt}
          className="aspect-video max-h-44 w-full shrink-0 rounded-none"
          overlay
        />

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {showMeter && scenario.meterLabel && scenario.goal && !hasWon && (
            <MeterBar meter={meter} label={scenario.meterLabel} goal={scenario.goal} />
          )}

          {hasWon && scenario.winMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {scenario.winMessage}
              </p>
              {levelContext ? (
                <Button className="mt-3" size="sm" variant="outline" onClick={onBack}>
                  Back to path
                </Button>
              ) : (
                <Button className="mt-3" size="sm" variant="outline" onClick={handleReplayScenario}>
                  <RotateCcw />
                  Play again
                </Button>
              )}
            </div>
          )}

          {isRoleplayMode && score?.reply && !hasWon && (
            <ReplyBubble
              reply={score.reply}
              onHear={() =>
                speakCharacterLine(replySpeechText(score.reply), "character", score.speaker)
              }
              disabled={isRecording || isScoring}
            />
          )}

          {isSpiritualMode && score?.reply && !hasWon && (
            <ReplyBubble
              reply={score.reply}
              onHear={() =>
                speakCharacterLine(replySpeechText(score.reply), "coach", score.speaker)
              }
              disabled={isRecording || isScoring}
            />
          )}

          {(isLanguageMode || isTeacher) && displayedPhrase && (
            <div className="flex items-center justify-center gap-2 text-center">
              <p className="truncate text-base font-medium">{displayedPhrase}</p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleHearPhrase(displayedPhrase)}
                disabled={isRecording || isScoring}
                aria-label="Hear phrase"
              >
                <Volume2 className="size-4" />
              </Button>
            </div>
          )}

          {score && !hasWon && showPronunciation && !isSpiritualMode && (
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
                      onSelect={() => handleWordSelect(word)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <Waveform analyser={waveformAnalyser} active={waveformActive} className="h-10 shrink-0" />

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
            </div>
          )}

          {displayError && (
            <p className="text-center text-xs text-destructive">{displayError}</p>
          )}

          {!hasWon && compactPhrases.length > 0 && (
            <PhraseRail
              sentences={compactPhrases}
              onSelect={(sentence) =>
                score ? handleSelectNext(sentence) : handleSelectExample(sentence)
              }
            />
          )}

          {score && !hasWon && !isSpiritualMode && (
            <Button variant="ghost" size="xs" className="mx-auto" onClick={handleReset}>
              <RotateCcw className="size-3" />
              Try again
            </Button>
          )}
        </div>
      </div>

      {!levelContext && (
        <div className="shrink-0 pt-2">
          <LanguagePicker
            languageId={languageId}
            regionId={regionId}
            onLanguageChange={setLanguageId}
            onRegionChange={setRegionId}
          />
        </div>
      )}
    </div>
  )
}
