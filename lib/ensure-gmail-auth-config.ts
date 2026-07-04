import type { Composio } from "@composio/core"

const COMPOSIO_CALLBACK = "https://backend.composio.dev/api/v3/toolkits/auth/callback"
const CUSTOM_AUTH_NAME = "parler-bien-gmail-custom"

export async function ensureCustomGmailAuthConfig(
  composio: Composio,
): Promise<string | undefined> {
  const fromEnv = process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID?.trim()
  if (fromEnv) return fromEnv

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return undefined

  const listed = await composio.authConfigs.list({})
  const existing = (listed.items ?? []).find(
    (item) => item.name === CUSTOM_AUTH_NAME && item.status === "ENABLED",
  )
  if (existing) return existing.id

  const created = await composio.authConfigs.create("GMAIL", {
    type: "use_custom_auth",
    name: CUSTOM_AUTH_NAME,
    authScheme: "OAUTH2",
    credentials: {
      client_id: clientId,
      client_secret: clientSecret,
      oauth_redirect_uri: COMPOSIO_CALLBACK,
    },
  })

  return created.id
}
