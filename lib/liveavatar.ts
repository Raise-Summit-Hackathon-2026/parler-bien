import type { VoiceAgent } from "@/lib/agents"
import type { LanguageId } from "@/lib/languages"
import type { CharacterGender } from "@/lib/scenarios"

/** Documented sandbox-friendly default from LiveAvatar embed docs */
export const DEFAULT_LIVE_AVATAR_ID = "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0"

/** Max continuous LiveAvatar stream per session (seconds). */
export const LIVE_AVATAR_MAX_SESSION_SECONDS = 60

export type LiveAvatarCharacter = {
  id: string
  name: string
  gender: CharacterGender
  outfit: string
}

export const LIVE_AVATAR_CHARACTERS: LiveAvatarCharacter[] = [
  {
    id: "9c59a215-4c9f-478f-9d95-edca74c7b0d0",
    name: "Alessandra",
    gender: "female",
    outfit: "Black Suit",
  },
  {
    id: "f86e8b45-3389-424a-b3d7-7f6e8729e36d",
    name: "Marianne",
    gender: "female",
    outfit: "Black Suit",
  },
  {
    id: "075abc67-2fae-4548-8ca9-b815fcbd34c7",
    name: "Rika",
    gender: "female",
    outfit: "Black Suit",
  },
  {
    id: "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0",
    name: "June",
    gender: "female",
    outfit: "HR",
  },
  {
    id: "200eba85-74c0-4210-8670-81ceab4efd0d",
    name: "Pedro",
    gender: "male",
    outfit: "Black Suit",
  },
  {
    id: "03f8332d-9046-42a1-bff3-3b2309f77b58",
    name: "Graham",
    gender: "male",
    outfit: "Black Suit",
  },
  {
    id: "9650a758-1085-4d49-8bf3-f347565ec229",
    name: "Silas",
    gender: "male",
    outfit: "HR",
  },
  {
    id: "16141106-96b5-4dd9-9846-593728c5d0ed",
    name: "Thaddeus",
    gender: "male",
    outfit: "Black Shirt",
  },
]

export const LIVE_AVATAR_POOL = {
  female: LIVE_AVATAR_CHARACTERS.filter((c) => c.gender === "female").map((c) => c.id),
  male: LIVE_AVATAR_CHARACTERS.filter((c) => c.gender === "male").map((c) => c.id),
} as const

export function getLiveAvatarCharacter(id: string): LiveAvatarCharacter | undefined {
  return LIVE_AVATAR_CHARACTERS.find((character) => character.id === id)
}

export function formatLiveAvatarCharacterLabel(character: LiveAvatarCharacter): string {
  return `${character.name} — ${character.outfit}`
}

export type LiveAvatarSessionRequest = {
  agentId?: string
  avatarId?: string
  voiceId?: string
  language?: LanguageId
}

export function resolveLiveAvatarIdForAgent(agent: VoiceAgent): string {
  return agent.liveAvatarId ?? DEFAULT_LIVE_AVATAR_ID
}

export function resolveLiveAvatarIdForGender(
  gender: CharacterGender,
  seed = 0,
): string {
  const pool = LIVE_AVATAR_POOL[gender]
  return pool[Math.abs(seed) % pool.length] ?? DEFAULT_LIVE_AVATAR_ID
}

export function resolveLiveAvatarIdForScenario(
  agent: VoiceAgent | null,
  gender: CharacterGender,
  scenarioId?: string,
  roomLiveAvatarId?: string | null,
): string {
  if (roomLiveAvatarId?.trim()) return roomLiveAvatarId.trim()
  if (agent?.liveAvatarId) return agent.liveAvatarId
  if (agent) return resolveLiveAvatarIdForGender(gender)

  const seed = scenarioId
    ? scenarioId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0

  return resolveLiveAvatarIdForGender(gender, seed)
}

export function toLiveAvatarLanguage(languageId: LanguageId): string {
  return languageId
}
