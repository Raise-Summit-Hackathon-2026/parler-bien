import type { Composio } from "@composio/core"

import { getToolkitBySlug } from "@/lib/agent-config"
import { ensureCustomGmailAuthConfig } from "@/lib/ensure-gmail-auth-config"

export async function resolveAuthConfigId(
  composio: Composio,
  toolkitSlug: string,
): Promise<string | undefined> {
  if (toolkitSlug === "gmail") {
    const custom = await ensureCustomGmailAuthConfig(composio)
    if (custom) return custom
  }

  const toolkit = getToolkitBySlug(toolkitSlug)
  const envKey =
    toolkitSlug === "gmail"
      ? process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID
      : toolkitSlug === "googlecalendar"
        ? process.env.COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID
        : undefined

  if (envKey?.trim()) return envKey.trim()

  const listed = await composio.authConfigs.list({})
  const matches = (listed.items ?? []).filter((item) => {
    const slug = item.toolkit?.slug ?? item.toolkit
    return slug === toolkitSlug && item.status === "ENABLED"
  })

  if (!matches.length) return toolkit?.authConfigId

  // Prefer newest Composio-managed config (best chance after Google blocks an old one)
  const composioManaged = matches.filter((item) => item.isComposioManaged)
  const pool = composioManaged.length ? composioManaged : matches
  return pool[pool.length - 1]?.id ?? toolkit?.authConfigId
}

export async function listAuthConfigOptions(
  composio: Composio,
  toolkitSlug: string,
) {
  const listed = await composio.authConfigs.list({})
  return (listed.items ?? [])
    .filter((item) => {
      const slug = item.toolkit?.slug ?? item.toolkit
      return slug === toolkitSlug && item.status === "ENABLED"
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      isComposioManaged: item.isComposioManaged,
    }))
}
