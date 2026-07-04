import { NextResponse } from "next/server"

import { getToolkitBySlug } from "@/lib/agent-config"
import { listAuthConfigOptions, resolveAuthConfigId } from "@/lib/composio-auth"
import { getAgentUserId, getComposio } from "@/lib/composio"
import { getAppBaseUrl } from "@/lib/agent-config"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      toolkit?: string
      userId?: string
      authConfigId?: string
    }

    const slug = body.toolkit?.trim()
    if (!slug) {
      return NextResponse.json({ error: "toolkit is required" }, { status: 400 })
    }

    const toolkit = getToolkitBySlug(slug)
    if (!toolkit) {
      return NextResponse.json({ error: "Unknown toolkit" }, { status: 400 })
    }

    const userId = getAgentUserId(body.userId)
    const composio = getComposio()
    const authConfigId =
      body.authConfigId?.trim() ?? (await resolveAuthConfigId(composio, slug))

    if (!authConfigId) {
      return NextResponse.json(
        {
          error: `${toolkit.label} is not configured. Create an auth config at composio.dev → Auth configs.`,
          code: "NO_AUTH_CONFIG",
        },
        { status: 503 },
      )
    }

    const callbackUrl = `${getAppBaseUrl()}/agent?connected=${slug}`

    const connectionRequest = await composio.connectedAccounts.link(
      userId,
      authConfigId,
      { callbackUrl, allowMultiple: true },
    )

    return NextResponse.json({
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
      authConfigId,
      userId,
    })
  } catch (error) {
    console.error("Agent connect error:", error)
    const message = error instanceof Error ? error.message : "Failed to start connection"
    return NextResponse.json(
      {
        error: message,
        code: "CONNECT_FAILED",
        hint:
          "If Google blocked the sign-in, see troubleshooting on the agent page — try Advanced → Continue, or use a personal @gmail.com account.",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get("toolkit") ?? "gmail"
    const composio = getComposio()
    const options = await listAuthConfigOptions(composio, slug)
    const resolved = await resolveAuthConfigId(composio, slug)
    return NextResponse.json({ toolkit: slug, resolvedAuthConfigId: resolved, options })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list auth configs" },
      { status: 500 },
    )
  }
}
