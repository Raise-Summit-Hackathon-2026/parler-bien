import { NextResponse } from "next/server"

import { runAgentChat, type AgentChatMessage } from "@/lib/agent-chat"
import { recordAgentUsage } from "@/lib/agent-usage"
import { getAgentUserId } from "@/lib/composio"
import { transcribeAudio } from "@/lib/transcribe-audio"

export async function POST(request: Request) {
  let body: {
    audioBase64?: string
    audioFormat?: string
    userId?: string
    history?: AgentChatMessage[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { audioBase64, audioFormat, history = [] } = body

  if (!audioBase64 || !audioFormat) {
    return NextResponse.json(
      { error: "audioBase64 and audioFormat are required" },
      { status: 400 },
    )
  }

  const userId = getAgentUserId(body.userId)

  try {
    const { transcript, usage: sttUsage } = await transcribeAudio(audioBase64, audioFormat)
    recordAgentUsage({
      userId,
      channel: "browser_voice_stt",
      label: "Voice transcription",
      costUsd: sttUsage.costUsd,
      promptTokens: sttUsage.promptTokens,
      completionTokens: sttUsage.completionTokens,
    })

    const messages: AgentChatMessage[] = [
      ...history,
      { role: "user", content: transcript },
    ]
    const { reply, toolsUsed, usage: agentUsage } = await runAgentChat(userId, messages)
    recordAgentUsage({
      userId,
      channel: "browser_voice_agent",
      label: "Voice agent reply",
      costUsd: agentUsage.costUsd,
      promptTokens: agentUsage.promptTokens,
      completionTokens: agentUsage.completionTokens,
    })

    const turnCostUsd = sttUsage.costUsd + agentUsage.costUsd

    return NextResponse.json({
      transcript,
      reply,
      toolsUsed,
      turnCostUsd,
      messages: [...messages, { role: "assistant", content: reply }],
    })
  } catch (error) {
    console.error("Agent voice error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Voice agent failed" },
      { status: 500 },
    )
  }
}
