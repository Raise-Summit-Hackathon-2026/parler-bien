"use client"

import confetti from "canvas-confetti"
import { Bot, Loader2, Mic, Play, RotateCcw, Square, Volume2 } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react"

import { useLanguage } from "@/components/language-provider"
import { LanguagePicker } from "@/components/language-picker"
import { ScenarioBackButton } from "@/components/scenario-back-button"
import { ScenarioScene } from "@/components/scenario-scene"
import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useSpeaker } from "@/hooks/use-speaker"
import { markScenarioCompleted } from "@/lib/completions"
import { resolveMeterUpdate } from "@/lib/meter"
import { pickRandomSentences } from "@/lib/sentences"
import { authenticatedFetch } from "@/lib/supabase"
import {
  getScenarioContent,
  getScenarioFallbackLanguageId,
  getScenarioLanguageIds,
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

type RecordedAudio = {
  base64: string
  format: string
}

type PracticeSessionProps = {
  scenario: Scenario
  onBack: () => void
  backLabel?: string
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

function ExampleSuggestionCard({
  sentence,
  onSelect,
}: {
  sentence: SentenceSuggestion
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-xl border border-dashed bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
    >
      <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        Try saying
      </p>
      <p className="mt-1.5 text-sm font-medium leading-snug">{sentence.text}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sentence.hint}</p>
    </button>
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

function replySpeechText(reply: CharacterReply) {
  return reply.tts_text.trim() || reply.text
}

function formatRecordingDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
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
  backLabel = "Back",
}: PracticeSessionProps) {
  const { languageId, regionId, setLanguageId, setRegionId } = useLanguage()
  const isTeacher = scenario.id === "teacher"
  const isLanguageMode = isTeacher
  const isSpiritualMode = false
  const isRoleplayMode = !isTeacher
  const showPronunciation = isTeacher || isLanguageMode
  const showMeter =
    !isTeacher && Boolean(scenario.meterLabel && scenario.goal)
  const showWordBreakdown = isTeacher || isLanguageMode

  const initialTarget = null
  const availableLanguageIds = useMemo(
    () => getScenarioLanguageIds(scenario),
    [scenario],
  )
  const practiceLanguageId = useMemo(
    () => getScenarioFallbackLanguageId(scenario, languageId),
    [scenario, languageId],
  )
  const region = getRegion(practiceLanguageId, regionId)
  const scenarioContent = getScenarioContent(scenario, practiceLanguageId)

  const {
    isRecording,
    analyser: recorderAnalyser,
    error,
    recordingDurationMs,
    startRecording,
    stopRecording,
  } = useAudioRecorder({ onAutoStop: handleRecordedAudio })
  const {
    isSpeaking,
    analyser: speakerAnalyser,
    speak,
    stop: stopSpeaking,
  } = useSpeaker()

  const openingPlayed = useRef(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const examples = useMemo<SentenceSuggestion[]>(
    () =>
      isTeacher
        ? pickRandomSentences(EXAMPLE_COUNT, practiceLanguageId)
        : scenarioContent.starters,
    [isTeacher, practiceLanguageId, scenarioContent.starters],
  )

  const [targetPhrase, setTargetPhrase] = useState<string | null>(initialTarget)
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

  useEffect(() => {
    if (practiceLanguageId !== languageId) {
      setLanguageId(practiceLanguageId)
    }
  }, [languageId, practiceLanguageId, setLanguageId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" })
  }, [history.length])

  const characterGender: CharacterGender = resolveCharacterGender(
    scenario,
    lastSpeaker?.gender ?? score?.speaker.gender,
    randomScenarioGender
  )

  const displayError = error ?? requestError
  const isBusy = isScoring || isSpeaking

  const waveformAnalyser = isRecording ? recorderAnalyser : speakerAnalyser
  const waveformActive = isRecording || isSpeaking

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
      })
    },
    [scenario, randomScenarioGender, region.accent, speak],
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

    markScenarioCompleted(scenario.id)

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
  }, [hasWon, scenario.id])

  async function handleRecordedAudio(audio: RecordedAudio | null) {
    setRequestError(null)
    setIsScoring(true)

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
          languageId: practiceLanguageId,
          regionId: region.id,
          scenarioId: scenario.id,
          customScenario: isCustomScenarioId(scenario.id)
            ? scenario
            : undefined,
          history,
          characterGender,
          currentMeter: meter,
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
      setSelectedWord(result.words.find((w) => w.score < 80) ?? result.words[0])

      if (isRoleplayMode) {
        const nextMeter = resolveMeterUpdate(meter, result)
        setMeter(nextMeter)
        const won = result.goal_achieved || nextMeter >= 100
        setHasWon(won)
        setHistory((prev) => [
          ...prev,
          { role: "user", text: result.transcript },
          { role: "character", text: result.reply.text },
        ])
        speakCharacterLine(
          replySpeechText(result.reply),
          "character",
          result.speaker
        )
      } else if (isLanguageMode) {
        speakCharacterLine(
          replySpeechText(result.reply),
          "coach",
          result.speaker
        )
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
  }

  async function handleMicPress() {
    if (isBusy || hasWon) return

    if (isRecording) {
      const audio = await stopRecording()
      await handleRecordedAudio(audio)
      return
    }

    stopSpeaking()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    await startRecording()
  }

  function handleReset() {
    stopSpeaking()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
  }

  function handleReplayScenario() {
    stopSpeaking()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    setTargetPhrase(null)
    setMeter(0)
    setHasWon(false)
    setLastSpeaker(null)
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

  function handlePlayCharacterTurn(text: string) {
    speakCharacterLine(text, isSpiritualMode ? "coach" : "character")
  }

  function handleSelectExample(sentence: SentenceSuggestion) {
    stopSpeaking()
    setTargetPhrase(sentence.text)
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    speakCharacterLine(sentence.text, "phrase")
  }

  function handleSelectNext(sentence: SentenceSuggestion) {
    stopSpeaking()
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

  const exampleSuggestion = suggestionList[0] ?? null

  return (
    <div className="mx-auto flex h-svh w-full max-w-lg flex-col overflow-hidden px-4 py-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <ScenarioBackButton onBack={onBack} label={backLabel} />
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
        <ScenarioScene
          scenarioId={isBuiltInScenarioId(scenario.id) ? scenario.id : undefined}
          imagePrompt={isBuiltInScenarioId(scenario.id) ? undefined : scenario.imagePrompt}
          className="h-44 w-full shrink-0 rounded-none"
          overlay
        />

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {showMeter && scenario.meterLabel && scenario.goal && !hasWon && (
            <MeterBar meter={meter} label={scenario.meterLabel} goal={scenario.goal} />
          )}

          {(isRoleplayMode || isSpiritualMode) && history.length > 0 && (
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
              <Button className="mt-3" size="sm" variant="outline" onClick={handleReplayScenario}>
                <RotateCcw />
                Play again
              </Button>
            </div>
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
                <Play className="size-4 fill-current" />
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

          {!hasWon && exampleSuggestion && (
            <ExampleSuggestionCard
              sentence={exampleSuggestion}
              onSelect={() =>
                score
                  ? handleSelectNext(exampleSuggestion)
                  : handleSelectExample(exampleSuggestion)
              }
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

          {score && !hasWon && !isSpiritualMode && (
            <Button variant="ghost" size="xs" className="mx-auto" onClick={handleReset}>
              <RotateCcw className="size-3" />
              Try again
            </Button>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-2">
        <LanguagePicker
          languageId={practiceLanguageId}
          regionId={region.id}
          onLanguageChange={setLanguageId}
          onRegionChange={setRegionId}
          availableLanguageIds={availableLanguageIds}
        />
      </div>
    </div>
  )
}
