"use client"

import confetti from "canvas-confetti"
import { Loader2, Mic, RotateCcw, Square, Volume2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { LanguagePicker } from "@/components/language-picker"
import { ScenarioBackButton } from "@/components/scenario-picker"
import { ScenarioScene } from "@/components/scenario-scene"
import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useSpeaker } from "@/hooks/use-speaker"
import { markScenarioCompleted } from "@/lib/completions"
import { pickRandomSentences } from "@/lib/sentences"
import { authenticatedFetch } from "@/lib/supabase"
import {
  getScenarioContent,
  isBuiltInScenarioId,
  isCustomScenarioId,
  resolveCharacterGender,
  type CharacterGender,
  type Scenario,
} from "@/lib/scenarios"
import {
  getLanguage,
  getRegion,
  type LanguageId,
  type RegionId,
} from "@/lib/languages"
import type {
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
  languageId: LanguageId
  regionId: RegionId
  onLanguageChange: (languageId: LanguageId) => void
  onRegionChange: (regionId: RegionId) => void
  onBack: () => void
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
}: {
  sentence: SentenceSuggestion
  onSelect: () => void
}) {
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

function SpeakerProfileStrip({ speaker }: { speaker: SpeakerProfile }) {
  const genderLabel =
    speaker.gender === "unsure"
      ? "unsure"
      : speaker.gender.charAt(0).toUpperCase() + speaker.gender.slice(1)

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1">
          {speaker.accent}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1">
          {speaker.age_range}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1">{genderLabel}</span>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {speaker.notes}
      </p>
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

function HistoryLog({ history }: { history: ConversationTurn[] }) {
  const recent = history.slice(-6)
  if (recent.length === 0) return null

  return (
    <div className="max-h-40 space-y-2 overflow-y-auto rounded-2xl bg-muted/40 p-3 text-sm">
      {recent.map((turn, index) => (
        <div
          key={`${turn.role}-${index}-${turn.text.slice(0, 12)}`}
          className={cn(
            "rounded-xl px-3 py-2",
            turn.role === "user" ? "bg-background" : "bg-primary/5"
          )}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {turn.role === "user" ? "You" : "Character"}
          </p>
          <p>{turn.text}</p>
        </div>
      ))}
    </div>
  )
}

function ReplyBubble({
  reply,
  onHear,
  disabled,
}: {
  reply: { text: string; hint: string }
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

export function PracticeSession({
  scenario,
  languageId,
  regionId,
  onLanguageChange,
  onRegionChange,
  onBack,
}: PracticeSessionProps) {
  const isTeacher = scenario.id === "teacher"
  const language = getLanguage(languageId)
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

  const [examples, setExamples] = useState<SentenceSuggestion[]>(() =>
    isTeacher
      ? pickRandomSentences(EXAMPLE_COUNT, languageId)
      : scenarioContent.starters
  )
  const [targetPhrase, setTargetPhrase] = useState<string | null>(null)
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [meter, setMeter] = useState(0)
  const [hasWon, setHasWon] = useState(false)
  const [lastSpeaker, setLastSpeaker] = useState<SpeakerProfile | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [selectedWord, setSelectedWord] = useState<WordScore | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  const characterGender: CharacterGender = resolveCharacterGender(
    lastSpeaker?.gender ?? score?.speaker.gender
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
      const gender = resolveCharacterGender(speaker?.gender)
      const ageRange =
        scenario.id === "parisian" && speaker?.age_range
          ? speaker.age_range
          : scenario.voice.ageRange
      void speak(text, style, {
        gender,
        ageRange,
        tone: scenario.voice.tone,
        accent: region.accent,
      })
    },
    [scenario, region.accent, speak]
  )

  useEffect(() => {
    if (isTeacher || !scenarioContent.openingLine || openingPlayed.current)
      return

    openingPlayed.current = true
    setHistory([{ role: "character", text: scenarioContent.openingLine.text }])
    speakCharacterLine(scenarioContent.openingLine.text, "character")
  }, [isTeacher, scenarioContent.openingLine, speakCharacterLine])

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

        if (!isTeacher) {
          setMeter(result.meter)
          setHasWon(result.goal_achieved || result.meter >= 100)
          setHistory((prev) => [
            ...prev,
            { role: "user", text: result.transcript },
            { role: "character", text: result.reply.text },
          ])
          speakCharacterLine(result.reply.text, "character", result.speaker)
        } else {
          speakCharacterLine(result.reply.text, "coach", result.speaker)
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

    if (scenarioContent.openingLine) {
      setHistory([
        { role: "character", text: scenarioContent.openingLine.text },
      ])
      speakCharacterLine(scenarioContent.openingLine.text, "character")
    } else {
      setHistory([])
    }
  }

  function handleClearTarget() {
    stopSpeaking()
    setTargetPhrase(null)
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
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

  function handleShuffleExamples() {
    if (isTeacher) {
      setExamples(pickRandomSentences(EXAMPLE_COUNT, languageId))
    }
  }

  const suggestionList = score?.next_sentences.length
    ? score.next_sentences
    : !score
      ? examples
      : []

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-6 px-6 py-12">
      <ScenarioBackButton onBack={onBack} />

      <div className="w-full space-y-4 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {scenario.title}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isTeacher ? `Say something in ${language.name}` : scenario.tagline}
        </h1>
        <LanguagePicker
          languageId={languageId}
          regionId={regionId}
          onLanguageChange={onLanguageChange}
          onRegionChange={onRegionChange}
        />
        <p className="text-muted-foreground">
          {hasWon
            ? scenario.winMessage
            : score
              ? isTeacher
                ? "Tap a word to hear how it should sound."
                : "Keep the conversation going — tap the mic."
              : targetPhrase
                ? "Practice this phrase — tap the mic when ready."
                : isTeacher
                  ? "Tap the mic and speak — or pick a phrase below."
                  : `Tap the mic and respond in ${language.name}.`}
        </p>
      </div>

      <div className="w-full space-y-6 overflow-hidden rounded-3xl border bg-card shadow-sm">
        <ScenarioScene
          scenarioId={
            isBuiltInScenarioId(scenario.id) ? scenario.id : undefined
          }
          imagePrompt={
            isBuiltInScenarioId(scenario.id) ? undefined : scenario.imagePrompt
          }
          className="h-40 w-full rounded-none"
          overlay
        />

        <div className="space-y-6 p-6 pt-0">
          {!isTeacher && scenario.meterLabel && scenario.goal && !hasWon && (
            <MeterBar
              meter={meter}
              label={scenario.meterLabel}
              goal={scenario.goal}
            />
          )}

          {hasWon && scenario.winMessage && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                {scenario.winMessage}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={handleReplayScenario}
              >
                <RotateCcw />
                Play again
              </Button>
            </div>
          )}

          {!isTeacher && history.length > 0 && !hasWon && (
            <HistoryLog history={history} />
          )}

          {!isTeacher && score?.reply && !hasWon && (
            <ReplyBubble
              reply={score.reply}
              onHear={() =>
                speakCharacterLine(score.reply.text, "character", score.speaker)
              }
              disabled={isRecording || isScoring}
            />
          )}

          {isTeacher && displayedPhrase && (
            <div className="space-y-3 text-center">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {score ? "You said" : `${language.name} · ${region.label}`}
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-xl font-medium">{displayedPhrase}</p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleHearPhrase(displayedPhrase)}
                  disabled={isRecording || isScoring}
                  aria-label="Hear phrase"
                >
                  <Volume2 className="size-4" />
                </Button>
                {!score && targetPhrase && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleClearTarget}
                    disabled={isRecording || isScoring}
                    aria-label="Clear phrase"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          <Waveform analyser={waveformAnalyser} active={waveformActive} />

          {!hasWon && (
            <div className="flex flex-col items-center gap-3">
              <Button
                size="icon-lg"
                className={cn(
                  "size-16 rounded-full shadow-md transition-transform",
                  isRecording &&
                    "scale-105 bg-destructive hover:bg-destructive/90"
                )}
                onClick={handleMicPress}
                disabled={isBusy}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isScoring ? (
                  <Loader2 className="size-7 animate-spin" />
                ) : isRecording ? (
                  <Square className="size-6 fill-current" />
                ) : (
                  <Mic className="size-7" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isScoring
                  ? "Analyzing…"
                  : isSpeaking
                    ? isTeacher
                      ? "Your coach is speaking…"
                      : "Character is speaking…"
                    : isRecording
                      ? "Tap to stop"
                      : "Tap to speak"}
              </p>
            </div>
          )}

          {displayError && (
            <p className="text-center text-sm text-destructive">
              {displayError}
            </p>
          )}

          {score && !hasWon && (
            <div className="space-y-5 border-t pt-5">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Pronunciation</p>
                <p
                  className={cn(
                    "text-4xl font-semibold tabular-nums",
                    scoreColor(score.overall_score)
                  )}
                >
                  {Math.round(score.overall_score)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {score.coaching}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {score.words.map((word, index) => (
                  <WordChip
                    key={`${word.word}-${index}`}
                    word={word}
                    selected={selectedIndex === index}
                    onSelect={() => handleWordSelect(word)}
                  />
                ))}
              </div>

              {selectedWord && selectedWord.score < 80 && (
                <div className="rounded-2xl bg-muted/60 p-4 text-sm">
                  <p className="font-medium">{selectedWord.word}</p>
                  {selectedWord.issue && (
                    <p className="mt-1 text-muted-foreground">
                      {selectedWord.issue}
                    </p>
                  )}
                  {selectedWord.tip && (
                    <p className="mt-2 text-foreground">{selectedWord.tip}</p>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                <RotateCcw />
                Try again
              </Button>

              <SpeakerProfileStrip speaker={score.speaker} />

              {suggestionList.length > 0 && (
                <div className="space-y-3 border-t pt-5">
                  <p className="text-center text-sm font-medium">
                    {score ? "Continue the conversation" : "Try a phrase"}
                  </p>
                  {isTeacher && !score && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={handleShuffleExamples}
                        disabled={isRecording || isScoring}
                      >
                        Shuffle
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {suggestionList.map((sentence, index) => (
                      <SentenceChip
                        key={`${sentence.text}-${index}`}
                        sentence={sentence}
                        onSelect={() =>
                          score
                            ? handleSelectNext(sentence)
                            : handleSelectExample(sentence)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!score && !hasWon && suggestionList.length > 0 && isTeacher && (
            <div className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Try a phrase</p>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleShuffleExamples}
                  disabled={isRecording || isScoring}
                >
                  Shuffle
                </Button>
              </div>
              <div className="space-y-2">
                {suggestionList.map((sentence, index) => (
                  <SentenceChip
                    key={`${sentence.text}-${index}`}
                    sentence={sentence}
                    onSelect={() => handleSelectExample(sentence)}
                  />
                ))}
              </div>
            </div>
          )}

          {!score && !hasWon && !isTeacher && suggestionList.length > 0 && (
            <div className="space-y-3 border-t pt-5">
              <p className="text-sm font-medium">Try saying</p>
              <div className="space-y-2">
                {suggestionList.map((sentence, index) => (
                  <SentenceChip
                    key={`${sentence.text}-${index}`}
                    sentence={sentence}
                    onSelect={() => handleSelectExample(sentence)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
