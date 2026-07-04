import { NextRequest, NextResponse } from "next/server"

import { runAgentChat } from "@/lib/agent-chat"
import {
  getLineByAgentPhoneId,
  isInboundCallerAllowed,
} from "@/lib/agent-lines"
import { sendAgentPhoneMessage } from "@/lib/agentphone-client"

type AgentPhoneWebhook = {
  event?: string
  channel?: string
  agentId?: string
  data?: {
    from?: string
    to?: string
    message?: string
    transcript?: string
    direction?: string
  }
  recentHistory?: Array<{ content?: string; direction?: string }>
}

function userText(payload: AgentPhoneWebhook): string {
  if (payload.channel === "voice") {
    return payload.data?.transcript?.trim() ?? ""
  }
  return payload.data?.message?.trim() ?? ""
}

function historyFromPayload(payload: AgentPhoneWebhook) {
  return (payload.recentHistory ?? [])
    .filter((item) => item.content?.trim())
    .slice(-6)
    .map((item) => ({
      role: item.direction === "outbound" ? ("assistant" as const) : ("user" as const),
      content: item.content!.trim(),
    }))
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as AgentPhoneWebhook

  if (payload.event === "agent.call_ended") {
    return NextResponse.json({ ok: true })
  }

  if (payload.event !== "agent.message" || !payload.agentId) {
    return NextResponse.json({ ok: true })
  }

  const line = getLineByAgentPhoneId(payload.agentId)
  if (!line) {
    if (payload.channel === "voice") {
      return NextResponse.json({ text: "This agent deployment is not configured." })
    }
    return NextResponse.json({ ok: true })
  }

  const caller = payload.data?.from
  if (!isInboundCallerAllowed(line, caller, true)) {
    if (payload.channel === "voice") {
      return NextResponse.json({
        text: "This business line is restricted to approved callers only.",
        hangup: true,
      })
    }
    if (caller) {
      await sendAgentPhoneMessage({
        agentId: payload.agentId,
        toNumber: caller,
        body: "This line is restricted to approved callers.",
        numberId: line.agentPhoneNumberId,
      }).catch(() => undefined)
    }
    return NextResponse.json({ ok: true })
  }

  const text = userText(payload)
  if (!text) {
    if (payload.channel === "voice") {
      return NextResponse.json({ text: "Sorry, I didn't catch that." })
    }
    return NextResponse.json({ ok: true })
  }

  try {
    const prior = historyFromPayload(payload).filter((m) => m.content !== text)
    const messages = [...prior, { role: "user" as const, content: text }]
    const { reply } = await runAgentChat(line.userId, messages)

    if (payload.channel === "voice") {
      return NextResponse.json({ text: reply })
    }

    if (caller) {
      await sendAgentPhoneMessage({
        agentId: payload.agentId,
        toNumber: caller,
        body: reply,
        numberId: line.agentPhoneNumberId,
      })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("AgentPhone webhook error:", error)
    if (payload.channel === "voice") {
      return NextResponse.json({ text: "Something went wrong. Please try again." })
    }
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "agentphone-webhook" })
}
