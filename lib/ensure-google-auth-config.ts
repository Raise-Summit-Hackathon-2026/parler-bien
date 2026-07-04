import type { Composio } from "@composio/core"

import { getGoogleOAuthRedirectUri } from "@/lib/agent-config"

/** Legacy Composio callback — only needed for older auth configs */
export const COMPOSIO_CALLBACK_LEGACY =
  "https://backend.composio.dev/api/v3/toolkits/auth/callback"

const GOOGLE_SCOPES_BASE = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(",")

export const GMAIL_READONLY_SCOPES = `${GOOGLE_SCOPES_BASE},https://www.googleapis.com/auth/gmail.readonly`

export const GOOGLE_CALENDAR_READONLY_SCOPES = `${GOOGLE_SCOPES_BASE},https://www.googleapis.com/auth/calendar.readonly`

export const GOOGLE_DRIVE_READONLY_SCOPES = `${GOOGLE_SCOPES_BASE},https://www.googleapis.com/auth/drive.readonly`

const GOOGLE_TOOLKITS: Record<
  string,
  { composioToolkit: string; scopes: string; envKey: string }
> = {
  gmail: {
    composioToolkit: "GMAIL",
    scopes: GMAIL_READONLY_SCOPES,
    envKey: "COMPOSIO_GMAIL_AUTH_CONFIG_ID",
  },
  googlecalendar: {
    composioToolkit: "GOOGLECALENDAR",
    scopes: GOOGLE_CALENDAR_READONLY_SCOPES,
    envKey: "COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID",
  },
  googledrive: {
    composioToolkit: "GOOGLEDRIVE",
    scopes: GOOGLE_DRIVE_READONLY_SCOPES,
    envKey: "COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID",
  },
}

function authConfigName(slug: string): string {
  try {
    const host = new URL(getGoogleOAuthRedirectUri()).host.replace(/[^a-zA-Z0-9-]/g, "-")
    return `parler-bien-${slug}-proxy-${host}`
  } catch {
    return `parler-bien-${slug}-proxy-default`
  }
}

export function isGoogleToolkit(slug: string): boolean {
  return slug in GOOGLE_TOOLKITS
}

export async function ensureCustomGoogleAuthConfig(
  composio: Composio,
  toolkitSlug: string,
): Promise<string | undefined> {
  const meta = GOOGLE_TOOLKITS[toolkitSlug]
  if (!meta) return undefined

  const fromEnv = process.env[meta.envKey]?.trim()
  if (fromEnv) return fromEnv

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return undefined

  const name = authConfigName(toolkitSlug)
  const listed = await composio.authConfigs.list({})
  const existing = (listed.items ?? []).find(
    (item) => item.name === name && item.status === "ENABLED",
  )
  if (existing) return existing.id

  const created = await composio.authConfigs.create(meta.composioToolkit, {
    type: "use_custom_auth",
    name,
    authScheme: "OAUTH2",
    credentials: {
      client_id: clientId,
      client_secret: clientSecret,
      oauth_redirect_uri: getGoogleOAuthRedirectUri(),
      scopes: meta.scopes,
    },
  })

  return created.id
}

/** @deprecated use ensureCustomGoogleAuthConfig */
export async function ensureCustomGmailAuthConfig(
  composio: Composio,
): Promise<string | undefined> {
  return ensureCustomGoogleAuthConfig(composio, "gmail")
}
