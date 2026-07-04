export type WordScore = {
  word: string
  score: number
  issue: string | null
  tip: string | null
}

export type { TtsStyle } from "@/lib/tts"

export type PronunciationScore = {
  overall_score: number
  coaching: string
  voice_line: string
  words: WordScore[]
}

export type ScoreRequest = {
  audioBase64: string
  audioFormat: string
  phrase: string
  language: string
}
