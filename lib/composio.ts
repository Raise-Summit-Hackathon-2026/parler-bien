import { Composio } from "@composio/core"

let client: Composio | null = null

export function getComposio(): Composio {
  const apiKey = process.env.COMPOSIO_API_KEY
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not configured")
  }

  if (!client) {
    client = new Composio({ apiKey })
  }

  return client
}

export function getAgentUserId(requestUserId?: string | null): string {
  const trimmed = requestUserId?.trim()
  if (trimmed) return trimmed
  return process.env.COMPOSIO_DEFAULT_USER_ID ?? "parler-bien-demo"
}
