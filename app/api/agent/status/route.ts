import { NextResponse } from "next/server"

import { AGENT_TOOLKITS } from "@/lib/agent-config"
import { getAgentUserId, getComposio } from "@/lib/composio"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = getAgentUserId(searchParams.get("userId"))

    const composio = getComposio()
    const accounts = await composio.connectedAccounts.list({ userIds: [userId] })

    const active = (accounts.items ?? []).filter((a) => a.status === "ACTIVE")

    const toolkits = AGENT_TOOLKITS.map((toolkit) => {
      const connection = active.find(
        (a) => (a.toolkit?.slug ?? a.toolkit) === toolkit.slug,
      )
      return {
        slug: toolkit.slug,
        label: toolkit.label,
        description: toolkit.description,
        connected: Boolean(connection),
        connectionId: connection?.id ?? null,
        configured: Boolean(toolkit.authConfigId),
      }
    })

    return NextResponse.json({ userId, toolkits })
  } catch (error) {
    console.error("Agent status error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load status" },
      { status: 500 },
    )
  }
}
