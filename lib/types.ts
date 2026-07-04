import type { AgentType, VoiceAgent } from "@/lib/agents"
import type { LanguageId, RegionId } from "@/lib/languages"
import type { Scenario, ScenarioId } from "@/lib/scenarios"
import type { LevelRoom, PassCriteria } from "@/lib/tracks"

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

export type CharacterReply = {
  text: string
  hint: string
}

export type ConversationTurn = {
  role: "user" | "character"
  text: string
}

export type SpeakerProfile = {
  accent: string
  age_range: string
  gender: "male" | "female" | "unsure"
  notes: string
}

export type { TtsStyle, TtsRequestOptions } from "@/lib/tts"
export type { Scenario, ScenarioId } from "@/lib/scenarios"

export type PronunciationScore = {
  overall_score: number
  coaching: string
  transcript: string
  reply: CharacterReply
  meter: number
  goal_achieved: boolean
  words: WordScore[]
  next_sentences: SentenceSuggestion[]
  speaker: SpeakerProfile
}

export type ScoreRequest = {
  audioBase64: string
  audioFormat: string
  phrase?: string
  languageId: LanguageId
  regionId: RegionId
  scenarioId?: ScenarioId
  customScenario?: Scenario
  history?: ConversationTurn[]
  characterGender?: "male" | "female"
  currentMeter?: number
  agentType?: AgentType
  agent?: VoiceAgent
  levelRoom?: LevelRoom
}

export type { LevelContext } from "@/lib/level-scenario"
export type { AgentType, VoiceAgent, AgentCapability, AgentSkill } from "@/lib/agents"
export type { LearningTrack, TrackLevel, PassCriteria, LevelStatus } from "@/lib/tracks"
