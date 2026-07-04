import { NextResponse } from "next/server"

import { AGENT_TOOLKITS, getGoogleCloudProjectNumber } from "@/lib/agent-config"
import { probeToolkitHealth } from "@/lib/agent-connections"
import { resolveAuthConfigId } from "@/lib/composio-auth"
import { getAgentUserId, getComposio } from "@/lib/composio"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = getAgentUserId(searchParams.get("userId"))

    const composio = getComposio()
    const accounts = await composio.connectedAccounts.list({ userIds: [userId] })
    const active = (accounts.items ?? []).filter((a) => a.status === "ACTIVE")

    const toolkits = await Promise.all(
      AGENT_TOOLKITS.map(async (toolkit) => {
        const connection = active.find(
          (a) => (a.toolkit?.slug ?? a.toolkit) === toolkit.slug,
        )
        const authConfigId = await resolveAuthConfigId(composio, toolkit.slug)
        const connected = Boolean(connection)
        let working: boolean | null = null
        let workError: string | null = null

        if (connected) {
          const probe = await probeToolkitHealth(userId, toolkit.slug)
          working = probe.ok
          workError = probe.error ?? null
        }

        return {
          slug: toolkit.slug,
          label: toolkit.label,
          description: toolkit.description,
          connected,
          working,
          workError,
          connectionId: connection?.id ?? null,
          configured: Boolean(authConfigId),
          connectHint: toolkit.connectHint ?? null,
        }
      }),
    )

    return NextResponse.json({ userId, toolkits, googleCloudProjectNumber: getGoogleCloudProjectNumber() })
  } catch (error) {
    console.error("Agent status error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load status" },
      { status: 500 },
    )
  }
}
