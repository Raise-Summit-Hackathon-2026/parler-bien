"use client"

import { Loader2, Mic, RotateCcw, Square } from "lucide-react"
import { useMemo, useState } from "react"

import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import type { PronunciationScore, WordScore } from "@/lib/types"
import { cn } from "@/lib/utils"

const DEFAULT_PHRASE = "Je voudrais un croissant"
const DEFAULT_LANGUAGE = "French"

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
        "rounded-full px-3 py-1.5 text-lg font-medium ring-1 transition-all",
        scoreBg(word.score),
        scoreColor(word.score),
        selected && "ring-2 ring-foreground/30",
      )}
    >
      {word.word}
    </button>
  )
}

export function PracticeSession() {
  const { isRecording, analyser, error, startRecording, stopRecording } =
    useAudioRecorder()

  const [isScoring, setIsScoring] = useState(false)
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [selectedWord, setSelectedWord] = useState<WordScore | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  const displayError = error ?? requestError

  const selectedIndex = useMemo(() => {
    if (!score || !selectedWord) return -1
    return score.words.findIndex((w) => w.word === selectedWord.word)
  }, [score, selectedWord])

  async function handleMicPress() {
    if (isScoring) return

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
        const response = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: audio.base64,
            audioFormat: audio.format,
            phrase: DEFAULT_PHRASE,
            language: DEFAULT_LANGUAGE,
          }),
        })

        if (!response.ok) {
          const data = (await response.json()) as { error?: string }
          throw new Error(data.error ?? "Scoring failed")
        }

        const result = (await response.json()) as PronunciationScore
        setScore(result)
        setSelectedWord(result.words.find((w) => w.score < 80) ?? result.words[0])
      } catch (err) {
        setRequestError(
          err instanceof Error ? err.message : "Something went wrong",
        )
      } finally {
        setIsScoring(false)
      }
      return
    }

    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
    await startRecording()
  }

  function handleReset() {
    setScore(null)
    setSelectedWord(null)
    setRequestError(null)
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Parler Bien
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Practice your pronunciation
        </h1>
        <p className="text-muted-foreground">
          Say it out loud. Tap any word to see how to improve it.
        </p>
      </div>

      <div className="w-full space-y-6 rounded-3xl border bg-card p-6 shadow-sm">
        <div className="space-y-3 text-center">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {DEFAULT_LANGUAGE}
          </p>
          <p className="text-2xl font-medium">{DEFAULT_PHRASE}</p>
        </div>

        <Waveform analyser={analyser} active={isRecording} />

        <div className="flex flex-col items-center gap-3">
          <Button
            size="icon-lg"
            className={cn(
              "size-16 rounded-full shadow-md transition-transform",
              isRecording && "scale-105 bg-destructive hover:bg-destructive/90",
            )}
            onClick={handleMicPress}
            disabled={isScoring}
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
              ? "Analyzing your pronunciation…"
              : isRecording
                ? "Tap to stop"
                : "Tap to speak"}
          </p>
        </div>

        {displayError && (
          <p className="text-center text-sm text-destructive">{displayError}</p>
        )}

        {score && (
          <div className="space-y-5 border-t pt-5">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Your score</p>
              <p
                className={cn(
                  "text-5xl font-semibold tabular-nums",
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
                  onSelect={() => setSelectedWord(word)}
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

            <Button
              variant="outline"
              className="w-full"
              onClick={handleReset}
            >
              <RotateCcw />
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
