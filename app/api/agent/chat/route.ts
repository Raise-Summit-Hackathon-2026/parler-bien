import { NextResponse } from "next/server"

import { runAgentChat, type AgentChatMessage } from "@/lib/agent-chat"
import { recordAgentUsage } from "@/lib/agent-usage"
import { getAgentUserId } from "@/lib/composio"

export async function POST(request: Request) {
  let body: { messages?: AgentChatMessage[]; userId?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const messages = body.messages?.filter((m) => m.content?.trim())
  if (!messages?.length) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 })
  }

  const userId = getAgentUserId(body.userId)

  try {
    const { reply, toolsUsed, usage } = await runAgentChat(userId, messages)
    recordAgentUsage({
      userId,
      channel: "browser_chat",
      label: "Chat message",
      costUsd: usage.costUsd,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
    })
    return NextResponse.json({ reply, toolsUsed, turnCostUsd: usage.costUsd })
  } catch (error) {
    console.error("Agent chat error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent chat failed" },
      { status: 500 },
    )
  }
}
