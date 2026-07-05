import {
  DEFAULT_LIVE_AVATAR_ID,
  getLiveAvatarMaxSessionSeconds,
  isAllowedLiveAvatarId,
  isLiveAvatarSandbox,
  SANDBOX_AVATAR_ID,
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

export function resolveSessionAvatarId(body: LiveAvatarSessionRequest): string {
  if (isLiveAvatarSandbox()) {
    return SANDBOX_AVATAR_ID
  }

  if (body.avatarId && isAllowedLiveAvatarId(body.avatarId)) {
    return body.avatarId
  }

  return DEFAULT_LIVE_AVATAR_ID
}

function parseMaxAllowedSessionSeconds(errorText: string): number | null {
  const match = errorText.match(/maximum allowed \((\d+)s\)/i)
  if (!match) return null

  const seconds = Number.parseInt(match[1]!, 10)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

function buildSessionPayload(options: {
  avatarId: string
  language: LanguageId
  sandbox: boolean
  maxSessionDuration: number
}) {
  return {
    mode: "FULL",
    avatar_id: options.avatarId,
    is_sandbox: options.sandbox,
    interactivity_type: "PUSH_TO_TALK",
    video_settings: {
      quality: "medium",
      encoding: "H264",
    },
    max_session_duration: options.maxSessionDuration,
    avatar_persona: {
      language: toLiveAvatarLanguage(options.language),
    },
  }
}

export async function createLiveAvatarSessionToken(options: {
  avatarId: string
  language: LanguageId
}) {
  const sandbox = isLiveAvatarSandbox()
  const avatarId = sandbox ? SANDBOX_AVATAR_ID : options.avatarId
  let maxSessionDuration = getLiveAvatarMaxSessionSeconds()

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(LIVEAVATAR_API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": getLiveAvatarApiKey(),
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(
        buildSessionPayload({
          avatarId,
          language: options.language,
          sandbox,
          maxSessionDuration,
        }),
      ),
    })

    const responseText = await response.text()

    if (response.ok) {
      const json = JSON.parse(responseText) as {
        data?: { session_id?: string; session_token?: string }
        message?: string
      }

      const sessionId = json.data?.session_id
      const sessionToken = json.data?.session_token

      if (!sessionId || !sessionToken) {
        throw new Error(json.message ?? "LiveAvatar token response missing session data")
      }

      return {
        sessionId,
        sessionToken,
        avatarId,
        language: toLiveAvatarLanguage(options.language),
        sandbox,
        maxSessionDuration,
      }
    }

    const allowedMax = parseMaxAllowedSessionSeconds(responseText)
    if (allowedMax && maxSessionDuration > allowedMax && attempt === 0) {
      maxSessionDuration = allowedMax
      continue
    }

    throw new Error(
      `LiveAvatar token request failed (${response.status}): ${responseText}`,
    )
  }

  throw new Error("LiveAvatar token request failed after retrying with account limits")
}
