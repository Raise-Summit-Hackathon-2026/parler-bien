"use client"

import { useCallback, useMemo, useState } from "react"

import { useSpeaker, type AvatarAudioSink } from "@/hooks/use-speaker"
import { getRegion, type LanguageId, type RegionId } from "@/lib/languages"
import { resolveMeterUpdate } from "@/lib/meter"
import { authenticatedFetch } from "@/lib/supabase"
import {
  getScenarioContent,
  resolveCharacterGender,
  resolveCharacterVoice,
  type CharacterGender,
  type Scenario,
} from "@/lib/character"
import type {
  CharacterReply,
  ConversationTurn,
  PronunciationScore,
  SpeakerProfile,
  WordScore,
} from "@/lib/types"

export const GOAL_WIN_METER = 100

type RecordedAudio = {
  base64: string
  format: string
}

type SpeechStyle = "coach" | "character" | "phrase" | "word"

function replySpeechText(reply: CharacterReply) {
  return reply.tts_text.trim() || reply.text
}

export type UseConversationOptions = {
  scenario: Scenario
  languageId: LanguageId
  regionId: RegionId
  avatarSink?: AvatarAudioSink | null
  interruptAvatar?: () => void
  /** Stable seed so avatar + TTS pick the same gender for random characters */
  genderSeed?: string
}

export type UseConversationResult = {
  history: ConversationTurn[]
  meter: number
  score: PronunciationScore | null
  goalAchieved: boolean
  busy: boolean
  error: string | null
  submitAudio: (audio: RecordedAudio | null) => Promise<void>
  playReply: () => Promise<void>
  reset: () => void
  // --- members beyond the core contract, required to preserve the exact UI ---
  isScoring: boolean
  isSpeaking: boolean
  speakerAnalyser: AnalyserNode | null
  targetPhrase: string | null
  selectedWord: WordScore | null
  /** Speak an arbitrary line in the resolved character voice. */
  speakLine: (text: string, style: SpeechStyle, speaker?: SpeakerProfile | null) => void
  stopSpeaking: () => void
  /** Select a word chip and hear it. */
  selectWord: (word: WordScore) => void
  /** Pick a suggested phrase: set it as the target and optionally hear it. */
  pickPhrase: (text: string, options?: { speak?: boolean }) => void
  /** Light reset ("Try again"): clear the current score without ending the session. */
  clearScore: () => void
  /** Begin a free-form live turn (clears drill phrase + score). */
  beginLiveTurn: () => void
  /** Play opening line and mark conversation as started. */
  startConversation: () => void
  conversationStarted: boolean
}

export function useConversation({
  scenario,
  languageId,
  regionId,
  avatarSink,
  interruptAvatar,
  genderSeed,
}: UseConversationOptions): UseConversationResult {
  const mode = scenario.mode ?? "roleplay"
  const isRoleplayMode = mode === "roleplay"
  const isOpenMode = mode === "open"
  const hasGoal = Boolean(scenario.goal)

  const region = getRegion(languageId, regionId)
  const scenarioContent = getScenarioContent(scenario, languageId)

  const {
    isSpeaking,
    analyser: speakerAnalyser,
    speak,
    stop: stopSpeaking,
  } = useSpeaker({ avatarSink })

  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [meter, setMeter] = useState(0)
  const [goalAchieved, setGoalAchieved] = useState(false)
  const [targetPhrase, setTargetPhrase] = useState<string | null>(null)
  const [lastSpeaker, setLastSpeaker] = useState<SpeakerProfile | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [selectedWord, setSelectedWord] = useState<WordScore | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [conversationStarted, setConversationStarted] = useState(false)

  const sessionGenderSeed = genderSeed ?? scenario.id

  const characterGender: CharacterGender = resolveCharacterGender(
    scenario,
    lastSpeaker?.gender ?? score?.speaker.gender,
    sessionGenderSeed,
  )

  const speakLine = useCallback(
    (text: string, style: SpeechStyle, speaker?: SpeakerProfile | null) => {
      const gender = resolveCharacterGender(
        scenario,
        speaker?.gender,
        sessionGenderSeed,
      )
      const voice = resolveCharacterVoice(scenario, gender)
      const ageRange = scenario.voice.ageRange
      void speak(text, style, {
        gender,
        voice,
        ageRange,
        tone: scenario.voice.tone,
        accent: region.accent,
        deliveryStyle: scenario.deliveryStyle,
      })
    },
    [scenario, sessionGenderSeed, region.accent, speak],
  )

  const startConversation = useCallback(() => {
    if (conversationStarted) return

    setConversationStarted(true)
    setTargetPhrase(null)
    setScore(null)
    setRequestError(null)

    if (scenarioContent.openingLine) {
      setHistory([{ role: "character", text: scenarioContent.openingLine.text }])
      speakLine(
        scenarioContent.openingLine.text,
        isOpenMode ? "coach" : "character",
      )
    }
  }, [conversationStarted, scenarioContent.openingLine, isOpenMode, speakLine])

  const submitAudio = useCallback(
    async (audio: RecordedAudio | null) => {
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
            regionId: region.id,
            scenarioId: scenario.id,
            customScenario: scenario,
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
          setGoalAchieved(result.goal_achieved || nextMeter >= GOAL_WIN_METER)
          setHistory((prev) => [
            ...prev,
            { role: "user", text: result.transcript },
            { role: "character", text: result.reply.text },
          ])
          speakLine(replySpeechText(result.reply), "character", result.speaker)
        } else {
          speakLine(replySpeechText(result.reply), "coach", result.speaker)
        }
      } catch (err) {
        setRequestError(
          err instanceof Error ? err.message : "Something went wrong",
        )
      } finally {
        setIsScoring(false)
      }
    },
    [
      targetPhrase,
      languageId,
      regionId,
      scenario,
      history,
      characterGender,
      meter,
      isRoleplayMode,
      speakLine,
    ],
  )

  const playReply = useCallback(async () => {
    if (!score?.reply) return
    speakLine(
      replySpeechText(score.reply),
      isOpenMode ? "coach" : "character",
      score.speaker,
    )
  }, [score, isOpenMode, speakLine])

  const beginLiveTurn = useCallback(() => {
    stopSpeaking()
    interruptAvatar?.()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    setTargetPhrase(null)
  }, [stopSpeaking, interruptAvatar])

  const clearScore = useCallback(() => {
    stopSpeaking()
    interruptAvatar?.()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
  }, [stopSpeaking, interruptAvatar])

  const selectWord = useCallback(
    (word: WordScore) => {
      setSelectedWord(word)
      speakLine(word.word, "word")
    },
    [speakLine],
  )

  const pickPhrase = useCallback(
    (text: string, options?: { speak?: boolean }) => {
      stopSpeaking()
      interruptAvatar?.()
      setTargetPhrase(text)
      setScore(null)
      setSelectedWord(null)
      setRequestError(null)
      if (options?.speak !== false) {
        speakLine(text, "phrase")
      }
    },
    [stopSpeaking, interruptAvatar, speakLine],
  )

  const reset = useCallback(() => {
    stopSpeaking()
    interruptAvatar?.()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    setMeter(0)
    setGoalAchieved(false)
    setLastSpeaker(null)
    setTargetPhrase(null)
    setConversationStarted(false)

    setHistory([])
  }, [
    stopSpeaking,
    interruptAvatar,
  ])

  return {
    history,
    meter,
    score,
    goalAchieved,
    busy: isScoring || isSpeaking,
    error: requestError,
    submitAudio,
    playReply,
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
  }
}
