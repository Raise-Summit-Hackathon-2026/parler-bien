"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useSpeaker, type AvatarAudioSink } from "@/hooks/use-speaker"
import { getRegion, type LanguageId, type RegionId } from "@/lib/languages"
import { resolveMeterUpdate } from "@/lib/meter"
import { readScoreStream } from "@/lib/score-stream"
import { authenticatedFetch } from "@/lib/supabase"
import {
  getScenarioContent,
  randomCharacterGender,
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

export const GOAL_WIN_METER = 90
export const ROLEPLAY_START_METER = 18

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
}

export type UseConversationResult = {
  history: ConversationTurn[]
  meter: number
  score: PronunciationScore | null
  goalAchieved: boolean
  busy: boolean
  error: string | null
  /** Set when Nemotron flags the last turn's content; null otherwise. */
  moderationWarning: string | null
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
  /** Pick a suggested phrase: set it as the target and hear it. */
  pickPhrase: (text: string) => void
  /** Light reset ("Try again"): clear the current score without ending the session. */
  clearScore: () => void
}

export function useConversation({
  scenario,
  languageId,
  regionId,
  avatarSink,
  interruptAvatar,
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

  const openingPlayed = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [meter, setMeter] = useState(() =>
    isRoleplayMode && hasGoal ? ROLEPLAY_START_METER : 0,
  )
  const [goalAchieved, setGoalAchieved] = useState(false)
  const [targetPhrase, setTargetPhrase] = useState<string | null>(null)
  const [lastSpeaker, setLastSpeaker] = useState<SpeakerProfile | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [selectedWord, setSelectedWord] = useState<WordScore | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [moderationWarning, setModerationWarning] = useState<string | null>(
    null,
  )

  const randomScenarioGender = useMemo(
    () => randomCharacterGender(),
    // Re-roll only when the scenario changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario.id],
  )

  const characterGender: CharacterGender = resolveCharacterGender(
    scenario,
    lastSpeaker?.gender ?? score?.speaker.gender,
    randomScenarioGender,
  )

  const speakLine = useCallback(
    (text: string, style: SpeechStyle, speaker?: SpeakerProfile | null) => {
      const gender = resolveCharacterGender(
        scenario,
        speaker?.gender,
        randomScenarioGender,
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
        deliveryStyle: scenario.deliveryStyle,
      })
    },
    [scenario, randomScenarioGender, region.accent, speak],
  )

  useEffect(() => {
    if (!scenarioContent.openingLine || openingPlayed.current) return

    openingPlayed.current = true
    setHistory([{ role: "character", text: scenarioContent.openingLine.text }])
    speakLine(
      scenarioContent.openingLine.text,
      isOpenMode ? "coach" : "character",
    )
  }, [isOpenMode, scenarioContent.openingLine, speakLine])

  const submitAudio = useCallback(
    async (audio: RecordedAudio | null) => {
      setRequestError(null)
      setModerationWarning(null)
      setIsScoring(true)

      if (!audio) {
        setIsScoring(false)
        setRequestError("No audio captured. Try again.")
        return
      }

      // Defensive: kill any prior in-flight stream before starting a new one.
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      // Guards double-speak/double-append between the early reply event and
      // the score-event fallback. Closure-local — no re-render staleness.
      let replyHandled = false
      let scoreReceived = false
      let streamError: string | null = null

      const handleReply = (
        transcript: string,
        reply: CharacterReply,
        speaker: SpeakerProfile,
      ) => {
        if (replyHandled) return
        replyHandled = true
        setTargetPhrase(transcript)
        setLastSpeaker(speaker)
        if (isRoleplayMode) {
          setHistory((prev) => [
            ...prev,
            { role: "user", text: transcript },
            { role: "character", text: reply.text },
          ])
          speakLine(replySpeechText(reply), "character", speaker)
        } else {
          speakLine(replySpeechText(reply), "coach", speaker)
        }
      }

      try {
        const response = await authenticatedFetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
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
        if (!response.body) throw new Error("Scoring failed")

        await readScoreStream(response.body, (event) => {
          if (event.type === "reply") {
            handleReply(event.transcript, event.reply, event.speaker)
          } else if (event.type === "score") {
            scoreReceived = true
            const result = event.score
            setScore(result)
            setSelectedWord(
              result.words.find((w) => w.score < 80) ?? result.words[0],
            )
            if (isRoleplayMode) {
              const nextMeter = resolveMeterUpdate(meter, result)
              setMeter(nextMeter)
              setGoalAchieved(
                result.goal_achieved || nextMeter >= GOAL_WIN_METER,
              )
            }
            // Fallback: if the reply event never arrived, speak + append now
            // (no-op when replyHandled is already true).
            handleReply(result.transcript, result.reply, result.speaker)
            // Unlock the mic here — a trailing moderation verdict must never
            // delay it (isCharacterSpeaking still gates during playback).
            if (abortRef.current === ac) setIsScoring(false)
          } else if (event.type === "moderation") {
            if (!event.responseSafe) {
              // Cut unsafe generated speech mid-playback.
              stopSpeaking()
              interruptAvatar?.()
              setModerationWarning("That reply didn't pass our safety check.")
            } else if (!event.userSafe) {
              setModerationWarning(
                "That kind of language isn't okay here — keep it respectful and try again.",
              )
            }
          } else if (event.type === "error") {
            streamError = event.error
          }
        })

        if (streamError) throw new Error(streamError)
        if (!scoreReceived) throw new Error("Scoring ended unexpectedly")
      } catch (err) {
        // Reset/unmount/new-submit aborts are intentional — stay silent.
        if (ac.signal.aborted) return
        setRequestError(
          err instanceof Error ? err.message : "Something went wrong",
        )
      } finally {
        // Don't clobber the isScoring flag of a newer submitAudio call.
        if (abortRef.current === ac) setIsScoring(false)
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
      stopSpeaking,
      interruptAvatar,
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

  const clearScore = useCallback(() => {
    abortRef.current?.abort()
    stopSpeaking()
    interruptAvatar?.()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    setModerationWarning(null)
  }, [stopSpeaking, interruptAvatar])

  const selectWord = useCallback(
    (word: WordScore) => {
      setSelectedWord(word)
      speakLine(word.word, "word")
    },
    [speakLine],
  )

  const pickPhrase = useCallback(
    (text: string) => {
      abortRef.current?.abort()
      stopSpeaking()
      interruptAvatar?.()
      setTargetPhrase(text)
      setScore(null)
      setSelectedWord(null)
      setRequestError(null)
      setModerationWarning(null)
      speakLine(text, "phrase")
    },
    [stopSpeaking, interruptAvatar, speakLine],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    stopSpeaking()
    interruptAvatar?.()
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    setModerationWarning(null)
    setMeter(isRoleplayMode && hasGoal ? ROLEPLAY_START_METER : 0)
    setGoalAchieved(false)
    setLastSpeaker(null)
    setTargetPhrase(null)

    if (scenarioContent.openingLine) {
      setHistory([
        { role: "character", text: scenarioContent.openingLine.text },
      ])
      speakLine(scenarioContent.openingLine.text, "character")
    } else {
      setHistory([])
    }
  }, [
    stopSpeaking,
    interruptAvatar,
    isRoleplayMode,
    hasGoal,
    scenarioContent.openingLine,
    speakLine,
  ])

  return {
    history,
    meter,
    score,
    goalAchieved,
    busy: isScoring || isSpeaking,
    error: requestError,
    moderationWarning,
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
  }
}
