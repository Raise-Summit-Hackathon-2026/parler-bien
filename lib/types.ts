export type WordScore = {
  word: string
  score: number
  issue: string | null
  tip: string | null
}

export type SentenceSuggestion = {
  text: string
  hint: string
}

export type SpeakerProfile = {
  accent: string
  age_range: string
  gender: "male" | "female" | "unsure"
  notes: string
}

export type { TtsStyle, TtsRequestOptions } from "@/lib/tts"

export type PronunciationScore = {
  overall_score: number
  coaching: string
  voice_line: string
  transcript: string
  words: WordScore[]
  next_sentences: SentenceSuggestion[]
  speaker: SpeakerProfile
}

export type ScoreRequest = {
  audioBase64: string
  audioFormat: string
  phrase?: string
  language: string
}
