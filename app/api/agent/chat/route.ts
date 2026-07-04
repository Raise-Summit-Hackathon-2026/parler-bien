import { NextResponse } from "next/server"

import { runAgentChat, type AgentChatMessage } from "@/lib/agent-chat"
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
    const { reply, toolsUsed } = await runAgentChat(userId, messages)
    return NextResponse.json({ reply, toolsUsed })
  } catch (error) {
    console.error("Agent chat error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent chat failed" },
      { status: 500 },
    )
  }
}
