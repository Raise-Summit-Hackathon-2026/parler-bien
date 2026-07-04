"use client"

import confetti from "canvas-confetti"
import { Loader2, Mic, Play, RotateCcw, Square, Volume2 } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react"

<<<<<<< HEAD
import { LaughReferenceGallery } from "@/components/laugh-reference-gallery"
=======
import { useLanguage } from "@/components/language-provider"
>>>>>>> origin/main
import { LanguagePicker } from "@/components/language-picker"
import { ScenarioBackButton } from "@/components/scenario-picker"
import { ScenarioScene } from "@/components/scenario-scene"
import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useSpeaker } from "@/hooks/use-speaker"
import { markScenarioCompleted } from "@/lib/completions"
<<<<<<< HEAD
import { DEMO_BEATS, type DemoBeat } from "@/lib/demo"
import {
  getLinguaTrainerStarters,
  isLinguaTrainerId,
  isTrainerScenarioId,
} from "@/lib/lingua-trainers"
=======
import { hasCapability } from "@/lib/agents"
import type { LevelContext } from "@/lib/level-scenario"
import { resolveMeterUpdate } from "@/lib/meter"
import {
  markLevelCompleted,
  markLevelInProgress,
} from "@/lib/workspace-progress"
import { countPlayableLevels } from "@/lib/workspace-types"
>>>>>>> origin/main
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

<<<<<<< HEAD
type DemoSessionConfig = {
  beat: DemoBeat
  beatIndex: number
  beatCount: number
  onNextBeat: () => void
=======
type RecordedAudio = {
  base64: string
  format: string
>>>>>>> origin/main
}

type PracticeSessionProps = {
  scenario: Scenario
  onBack: () => void
<<<<<<< HEAD
  demo?: DemoSessionConfig
=======
  levelContext?: LevelContext
>>>>>>> origin/main
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
                  <Play className="size-3 fill-current" />
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
<<<<<<< HEAD
  demo,
}: PracticeSessionProps) {
  const isTeacher = scenario.id === "teacher"
  const isTrainer =
    isBuiltInScenarioId(scenario.id) && isTrainerScenarioId(scenario.id)
  const isLaughTrainer = scenario.id === "rich_laugher"
  const isSalesPitch = scenario.id === "sales_pitch"
  const isCoachMode = isTeacher || isTrainer
  const isRoleplay =
    !isCoachMode && Boolean(scenario.goal || scenario.meterLabel)
  const language = getLanguage(languageId)
=======
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
>>>>>>> origin/main
  const region = getRegion(languageId, regionId)
  const scenarioContent = getScenarioContent(scenario, languageId)

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
<<<<<<< HEAD
  const demoPhrasePlayed = useRef(false)

  const [examples, setExamples] = useState<SentenceSuggestion[]>(() => {
    if (demo) return [demo.beat.starter]
    if (isTrainer && isLinguaTrainerId(scenario.id)) {
      return getLinguaTrainerStarters(scenario.id).slice(0, EXAMPLE_COUNT)
    }
    if (isTeacher) return pickRandomSentences(EXAMPLE_COUNT, languageId)
    return scenarioContent.starters
  })
  const [targetPhrase, setTargetPhrase] = useState<string | null>(() =>
    demo ? demo.beat.starter.text : null,
  )
=======
  const chatEndRef = useRef<HTMLDivElement>(null)

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
>>>>>>> origin/main
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
        deliveryStyle: levelContext?.agent.deliveryStyle,
      })
    },
    [scenario, randomScenarioGender, region.accent, speak, levelContext?.agent.deliveryStyle],
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
    if (!demo || demoPhrasePlayed.current || !targetPhrase || !isCoachMode) return
    demoPhrasePlayed.current = true
    speakCharacterLine(targetPhrase, "phrase")
  }, [demo, targetPhrase, speakCharacterLine, isCoachMode])

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
      setSelectedWord(result.words.find((w) => w.score < 80) ?? result.words[0])

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
        speakCharacterLine(
          replySpeechText(result.reply),
          "character",
          result.speaker
        )
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
        speakCharacterLine(
          replySpeechText(result.reply),
          "coach",
          result.speaker
        )
      } else if (isLanguageMode) {
        const won = levelContext ? checkLevelWin(result) : false
        setHasWon(won)
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
<<<<<<< HEAD
      if (!audio) {
        setIsScoring(false)
        setRequestError("No audio captured. Try again.")
        return
      }

      try {
        const response = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: audio.base64,
            audioFormat: audio.format,
            phrase: targetPhrase ?? undefined,
            languageId,
            regionId,
            scenarioId: scenario.id,
            customScenario: isCustomScenarioId(scenario.id) ? scenario : undefined,
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

        if (!isCoachMode) {
          setMeter(result.meter)
          setHasWon(result.goal_achieved || result.meter >= 100)
          setHistory((prev) => [
            ...prev,
            { role: "user", text: result.transcript },
            { role: "character", text: result.reply.text },
          ])
          speakCharacterLine(result.reply.text, "character", result.speaker)
        } else {
          if (isLaughTrainer) {
            setMeter(result.meter)
            setHasWon(result.goal_achieved || result.overall_score >= 88)
          }
          speakCharacterLine(result.reply.text, "coach", result.speaker)
        }
      } catch (err) {
        setRequestError(
          err instanceof Error ? err.message : "Something went wrong",
        )
      } finally {
        setIsScoring(false)
      }
=======
      await handleRecordedAudio(audio)
>>>>>>> origin/main
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

<<<<<<< HEAD
  function handleShuffleExamples() {
    if (isTeacher) {
      setExamples(pickRandomSentences(EXAMPLE_COUNT, languageId))
      return
    }
    if (isLinguaTrainerId(scenario.id)) {
      const pool = getLinguaTrainerStarters(scenario.id)
      setExamples(pool.slice(0, EXAMPLE_COUNT))
    }
  }

=======
>>>>>>> origin/main
  const suggestionList = score?.next_sentences.length
    ? score.next_sentences
    : !score
      ? examples
      : []

<<<<<<< HEAD
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col items-center justify-center",
        demo ? "gap-4" : "min-h-svh gap-6 px-6 py-12",
      )}
    >
      {!demo && <ScenarioBackButton onBack={onBack} />}

      <div className="w-full space-y-4 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {scenario.title}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isTeacher
            ? `Say something in ${language.name}`
            : isLaughTrainer
              ? "Laugh like old money"
              : scenario.tagline}
        </h1>
        {!isTrainer && (
          <LanguagePicker
            languageId={languageId}
            regionId={regionId}
            onLanguageChange={onLanguageChange}
            onRegionChange={onRegionChange}
          />
        )}
        {isTrainer && (
          <p className="text-xs text-muted-foreground">
            {isSalesPitch ? "English · sales coach mode" : "English · voice coach mode"}
          </p>
        )}
        <p className="text-muted-foreground">
          {hasWon
            ? scenario.winMessage
            : score
              ? isLaughTrainer
                ? "Tap a dimension to see the roast."
                : isCoachMode
                  ? "Tap a word for tips — or try the next line."
                  : "Keep the conversation going — tap the mic."
              : targetPhrase
                ? isLaughTrainer
                  ? "Perform the prompt — then laugh."
                  : "Practice this phrase — tap the mic when ready."
                : isLaughTrainer
                  ? "Tap the mic and deliver one controlled laugh."
                  : isCoachMode
                    ? "Tap the mic and perform — or pick a line below."
                    : `Tap the mic and respond in ${language.name}.`}
=======
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
>>>>>>> origin/main
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        <ScenarioScene
          scenarioId={isBuiltInScenarioId(scenario.id) ? scenario.id : undefined}
          imagePrompt={isBuiltInScenarioId(scenario.id) ? undefined : scenario.imagePrompt}
          className="h-44 w-full shrink-0 rounded-none"
          overlay
        />

<<<<<<< HEAD
        <div className="space-y-6 p-6 pt-0">
        {!isCoachMode && scenario.meterLabel && scenario.goal && !hasWon && (
          <MeterBar meter={meter} label={scenario.meterLabel} goal={scenario.goal} />
        )}

        {isLaughTrainer && score && !hasWon && (
          <MeterBar meter={meter} label="Old money meter" goal="Score 88+ for yacht access" />
        )}

        {hasWon && scenario.winMessage && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              {scenario.winMessage}
            </p>
            <Button className="mt-4" variant="outline" onClick={handleReplayScenario}>
              <RotateCcw />
              Play again
            </Button>
          </div>
        )}

        {isRoleplay && history.length > 0 && !hasWon && (
          <HistoryLog history={history} />
        )}

        {isRoleplay && score?.reply && !hasWon && (
          <ReplyBubble
            reply={score.reply}
            onHear={() => speakCharacterLine(score.reply.text, "character", score.speaker)}
            disabled={isRecording || isScoring}
          />
        )}

        {isCoachMode && score?.reply && !hasWon && (
          <ReplyBubble
            reply={score.reply}
            onHear={() => speakCharacterLine(score.reply.text, "coach", score.speaker)}
            disabled={isRecording || isScoring}
          />
        )}

        {isLaughTrainer && displayedPhrase && (
          <div className="space-y-3 text-center">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {score ? "Your laugh" : "Ready"}
            </p>
            <p className="text-xl font-medium">{displayedPhrase}</p>
          </div>
        )}

        {isCoachMode && displayedPhrase && !isLaughTrainer && (
          <div className="space-y-3 text-center">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {score ? "You said" : `${language.name} · ${region.label}`}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-xl font-medium">{displayedPhrase}</p>
=======
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

          {(isLanguageMode || isTeacher) && displayedPhrase && (
            <div className="flex items-center justify-center gap-2 text-center">
              <p className="truncate text-base font-medium">{displayedPhrase}</p>
>>>>>>> origin/main
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

<<<<<<< HEAD
        <Waveform analyser={waveformAnalyser} active={waveformActive} />

        {!hasWon && (
          <div className="flex flex-col items-center gap-3">
            <Button
              size="icon-lg"
              className={cn(
                "size-16 rounded-full shadow-md transition-transform",
                isRecording && "scale-105 bg-destructive hover:bg-destructive/90",
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
                  ? isCoachMode
                    ? "Your coach is speaking…"
                    : "Character is speaking…"
                  : isRecording
                    ? "Tap to stop"
                    : isLaughTrainer
                      ? "Tap to laugh"
                      : "Tap to speak"}
            </p>
          </div>
        )}

        {displayError && (
          <p className="text-center text-sm text-destructive">{displayError}</p>
        )}

        {score && !hasWon && (
          <div className="space-y-5 border-t pt-5">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isLaughTrainer
                  ? "Laugh score"
                  : isSalesPitch
                    ? "Delivery score"
                    : isTrainer
                      ? "Authenticity"
                      : "Pronunciation"}
              </p>
              <p
                className={cn(
                  "text-4xl font-semibold tabular-nums",
                  scoreColor(score.overall_score),
                )}
              >
                {Math.round(score.overall_score)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{score.coaching}</p>
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
                  <p className="mt-1 text-muted-foreground">{selectedWord.issue}</p>
                )}
                {selectedWord.tip && (
                  <p className="mt-2 text-foreground">{selectedWord.tip}</p>
                )}
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={handleReset}>
              <RotateCcw />
              Try again
            </Button>

            {demo && (
              <Button className="w-full" onClick={demo.onNextBeat}>
                {demo.beatIndex < demo.beatCount - 1
                  ? `Next — ${DEMO_BEATS[demo.beatIndex + 1]?.title ?? "beat"}`
                  : "Finish demo"}
              </Button>
            )}

            <SpeakerProfileStrip speaker={score.speaker} />

            {suggestionList.length > 0 && (
              <div className="space-y-3 border-t pt-5">
                <p className="text-center text-sm font-medium">
                  {score
                    ? isLaughTrainer
                      ? "Try another laugh prompt"
                      : isCoachMode
                        ? "Level up — try next"
                        : "Continue the conversation"
                    : "Try a phrase"}
                </p>
                {isCoachMode && !score && suggestionList.length > 0 && (
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
                        score ? handleSelectNext(sentence) : handleSelectExample(sentence)
                      }
=======
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
>>>>>>> origin/main
                    />
                  ))}
                </div>
              )}
            </div>
          )}

<<<<<<< HEAD
        {!score && !hasWon && isLaughTrainer && (
          <LaughReferenceGallery />
        )}

        {!score && !hasWon && suggestionList.length > 0 && isCoachMode && (
          <div className="space-y-3 border-t pt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Try a phrase</p>
=======
          <Waveform analyser={waveformAnalyser} active={waveformActive} className="h-10 shrink-0" />

          {!hasWon && (
            <div className="flex shrink-0 flex-col items-center gap-1">
>>>>>>> origin/main
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

<<<<<<< HEAD
        {!score && !hasWon && !isCoachMode && suggestionList.length > 0 && (
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
=======
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
>>>>>>> origin/main
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
