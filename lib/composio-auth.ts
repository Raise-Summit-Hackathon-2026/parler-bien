import type { Composio } from "@composio/core"

import { getToolkitBySlug } from "@/lib/agent-config"
import {
  ensureCustomGoogleAuthConfig,
  isGoogleToolkit,
} from "@/lib/ensure-google-auth-config"

const ENV_AUTH_KEYS: Record<string, string> = {
  gmail: "COMPOSIO_GMAIL_AUTH_CONFIG_ID",
  googlecalendar: "COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID",
  googledrive: "COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID",
  outlook: "COMPOSIO_OUTLOOK_AUTH_CONFIG_ID",
  one_drive: "COMPOSIO_ONE_DRIVE_AUTH_CONFIG_ID",
  microsoft_teams: "COMPOSIO_MICROSOFT_TEAMS_AUTH_CONFIG_ID",
  whatsapp: "COMPOSIO_WHATSAPP_AUTH_CONFIG_ID",
}

export async function resolveAuthConfigId(
  composio: Composio,
  toolkitSlug: string,
): Promise<string | undefined> {
  if (isGoogleToolkit(toolkitSlug)) {
    const custom = await ensureCustomGoogleAuthConfig(composio, toolkitSlug)
    if (custom) return custom
  }

  const envKey = ENV_AUTH_KEYS[toolkitSlug]
  if (envKey && process.env[envKey]?.trim()) {
    return process.env[envKey]!.trim()
  }

  const toolkit = getToolkitBySlug(toolkitSlug)
  const listed = await composio.authConfigs.list({})
  const matches = (listed.items ?? []).filter((item) => {
    const slug = item.toolkit?.slug ?? item.toolkit
    return slug === toolkitSlug && item.status === "ENABLED"
  })

  if (!matches.length) return toolkit?.authConfigId

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
