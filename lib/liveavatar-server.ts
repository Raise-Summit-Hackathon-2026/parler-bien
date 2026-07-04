import {
  DEFAULT_LIVE_AVATAR_ID,
  LIVE_AVATAR_MAX_SESSION_SECONDS,
  toLiveAvatarLanguage,
  type LiveAvatarSessionRequest,
} from "@/lib/liveavatar"
import type { LanguageId } from "@/lib/languages"

const LIVEAVATAR_API_URL = "https://api.liveavatar.com/v1/sessions/token"

export function getLiveAvatarApiKey() {
  const key = process.env.LIVEAVATAR_API_KEY
  if (!key) {
    throw new Error("LIVEAVATAR_API_KEY is not configured")
  }
  return key
}

export function isLiveAvatarSandbox() {
  return process.env.NEXT_PUBLIC_LIVEAVATAR_SANDBOX === "true"
}

export function resolveSessionAvatarId(body: LiveAvatarSessionRequest): string {
  return body.avatarId ?? DEFAULT_LIVE_AVATAR_ID
}

export async function createLiveAvatarSessionToken(options: {
  avatarId: string
  language: LanguageId
  voiceId?: string
}) {
  const sandbox = isLiveAvatarSandbox()
  const avatarId = sandbox ? DEFAULT_LIVE_AVATAR_ID : options.avatarId

  const payload: Record<string, unknown> = {
    mode: "FULL",
    avatar_id: avatarId,
    is_sandbox: sandbox,
    interactivity_type: "PUSH_TO_TALK",
    video_settings: {
      quality: "medium",
      encoding: "H264",
    },
    max_session_duration: LIVE_AVATAR_MAX_SESSION_SECONDS,
    avatar_persona: {
      language: toLiveAvatarLanguage(options.language),
      ...(options.voiceId ? { voice_id: options.voiceId } : {}),
    },
  }

  const response = await fetch(LIVEAVATAR_API_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": getLiveAvatarApiKey(),
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`LiveAvatar token request failed (${response.status}): ${text}`)
  }

  const json = (await response.json()) as {
    data?: { session_id?: string; session_token?: string }
    message?: string
  }

  const sessionId = json.data?.session_id
  const sessionToken = json.data?.session_token

  if (!sessionId || !sessionToken) {
    throw new Error(json.message ?? "LiveAvatar token response missing session data")
  }

  return { sessionId, sessionToken }
}
