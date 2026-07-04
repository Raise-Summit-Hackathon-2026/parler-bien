import { NextResponse } from "next/server"

import { formatUsd, getUsageSummary } from "@/lib/agent-usage"
import { getAgentUserId } from "@/lib/composio"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = getAgentUserId(searchParams.get("userId"))
  const sessionSince = searchParams.get("since") ?? undefined
  const summary = getUsageSummary(userId, sessionSince)

  return NextResponse.json({
    userId,
    ...summary,
    formatted: {
      total: formatUsd(summary.totalUsd),
      session: formatUsd(summary.sessionUsd),
      estimates: {
        browserVoiceTurn: formatUsd(summary.estimates.browserVoiceTurnUsd),
        browserChatTurn: formatUsd(summary.estimates.browserChatTurnUsd),
        phoneVoiceTurn: formatUsd(summary.estimates.phoneVoiceTurnUsd),
        phoneSms: formatUsd(summary.estimates.phoneSmsUsd),
      },
    },
  })
}
