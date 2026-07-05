import type { CharacterGender, Character } from "@/lib/character"
import type { LanguageId } from "@/lib/languages"

/** Default avatar for existing characters without a stored liveAvatarId */
export const DEFAULT_LIVE_AVATAR_ID = "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0"

/** Only avatar supported in LiveAvatar sandbox mode (Wayne) */
export const SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a"

/**
 * Provider-level safety cap per session (seconds). Not surfaced in the UI —
 * idle pausing (below) is what actually bounds credit usage.
 */
export const LIVE_AVATAR_MAX_SESSION_SECONDS = 600

/** Pause the avatar session after this much idle time (no speech). */
export const LIVE_AVATAR_IDLE_PAUSE_SECONDS = 45

export type LiveAvatarCatalogEntry = {
  id: string
  name: string
  gender: CharacterGender
  outfit: string
  vibe: string
}

export const LIVE_AVATAR_CATALOG: LiveAvatarCatalogEntry[] = [
  {
    id: "9c59a215-4c9f-478f-9d95-edca74c7b0d0",
    name: "Alessandra",
    gender: "female",
    outfit: "Black Suit",
    vibe: "Professional, polished, corporate",
  },
  {
    id: "f86e8b45-3389-424a-b3d7-7f6e8729e36d",
    name: "Marianne",
    gender: "female",
    outfit: "Black Suit",
    vibe: "Warm, approachable service professional",
  },
  {
    id: "075abc67-2fae-4548-8ca9-b815fcbd34c7",
    name: "Rika",
    gender: "female",
    outfit: "Black Suit",
    vibe: "Calm, attentive hospitality",
  },
  {
    id: "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0",
    name: "June",
    gender: "female",
    outfit: "HR",
    vibe: "Friendly HR / onboarding guide",
  },
  {
    id: "200eba85-74c0-4210-8670-81ceab4efd0d",
    name: "Pedro",
    gender: "male",
    outfit: "Black Suit",
    vibe: "Confident business professional",
  },
  {
    id: "03f8332d-9046-42a1-bff3-3b2309f77b58",
    name: "Graham",
    gender: "male",
    outfit: "Black Suit",
    vibe: "Experienced mentor / manager",
  },
  {
    id: "9650a758-1085-4d49-8bf3-f347565ec229",
    name: "Silas",
    gender: "male",
    outfit: "HR",
    vibe: "Supportive coach / trainer",
  },
  {
    id: "16141106-96b5-4dd9-9846-593728c5d0ed",
    name: "Thaddeus",
    gender: "male",
    outfit: "Black Shirt",
    vibe: "Casual, everyday conversational",
  },
]

const CATALOG_BY_ID = new Map(LIVE_AVATAR_CATALOG.map((entry) => [entry.id, entry]))

export const LIVE_AVATAR_POOL = {
  female: LIVE_AVATAR_CATALOG.filter((c) => c.gender === "female").map((c) => c.id),
  male: LIVE_AVATAR_CATALOG.filter((c) => c.gender === "male").map((c) => c.id),
} as const

export const LIVE_AVATAR_CATALOG_IDS = LIVE_AVATAR_CATALOG.map((entry) => entry.id)

export function isLiveAvatarSandbox() {
  return process.env.NEXT_PUBLIC_LIVEAVATAR_SANDBOX === "true"
}

export function getLiveAvatarEntry(id: string): LiveAvatarCatalogEntry | undefined {
  return CATALOG_BY_ID.get(id)
}

export function isAllowedLiveAvatarId(id: string): boolean {
  return CATALOG_BY_ID.has(id) || id === SANDBOX_AVATAR_ID
}

export function formatLiveAvatarCatalogForPrompt(): string {
  return LIVE_AVATAR_CATALOG.map(
    (entry) =>
      `- ${entry.id}: ${entry.name} (${entry.gender}, ${entry.outfit}) — ${entry.vibe}`,
  ).join("\n")
}

export function resolveLiveAvatarIdForGender(
  gender: CharacterGender,
  seed = 0,
): string {
  const pool = LIVE_AVATAR_POOL[gender]
  return pool[Math.abs(seed) % pool.length] ?? DEFAULT_LIVE_AVATAR_ID
}

export function resolveLiveAvatarId(character: Pick<Character, "liveAvatarId" | "voice" | "id">): string {
  const stored = character.liveAvatarId?.trim()
  if (stored && isAllowedLiveAvatarId(stored)) {
    return isLiveAvatarSandbox() ? SANDBOX_AVATAR_ID : stored
  }

  const gender =
    character.voice?.gender === "male" || character.voice?.gender === "female"
      ? character.voice.gender
      : "female"

  const seed = character.id
    ? character.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0

  const picked = resolveLiveAvatarIdForGender(gender, seed)
  return isLiveAvatarSandbox() ? SANDBOX_AVATAR_ID : picked
}

export function resolveLiveAvatarIdForPractice(
  scenario: {
    liveAvatarId?: string
    id?: string
    voice?: { gender?: "male" | "female" | "random" | "opposite-speaker" }
  },
  gender: CharacterGender,
): string {
  const seed = scenario.id
    ? scenario.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0

  const stored = scenario.liveAvatarId?.trim()
  if (stored && isAllowedLiveAvatarId(stored)) {
    const entry = getLiveAvatarEntry(stored)
    if (!entry || entry.gender === gender) {
      return isLiveAvatarSandbox() ? SANDBOX_AVATAR_ID : stored
    }
  }

  const picked = resolveLiveAvatarIdForGender(gender, seed)
  return isLiveAvatarSandbox() ? SANDBOX_AVATAR_ID : picked
}

export function validateGeneratedLiveAvatarId(
  liveAvatarId: string | undefined,
  voiceGender: "male" | "female" | "random" | "opposite-speaker",
  resolvedGender?: CharacterGender,
): string {
  const gender: CharacterGender =
    voiceGender === "male" || voiceGender === "female"
      ? voiceGender
      : (resolvedGender ?? "female")

  if (liveAvatarId && isAllowedLiveAvatarId(liveAvatarId)) {
    const entry = getLiveAvatarEntry(liveAvatarId)
    if (entry && entry.gender === gender) {
      return isLiveAvatarSandbox() ? SANDBOX_AVATAR_ID : liveAvatarId
    }
  }

  return isLiveAvatarSandbox()
    ? SANDBOX_AVATAR_ID
    : resolveLiveAvatarIdForGender(gender)
}

export function toLiveAvatarLanguage(languageId: LanguageId): string {
  return languageId
}

export type LiveAvatarSessionRequest = {
  avatarId?: string
  language?: LanguageId
}
