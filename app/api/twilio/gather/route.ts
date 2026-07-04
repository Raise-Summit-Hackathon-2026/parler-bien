import { NextRequest, NextResponse } from "next/server"

import { getLineByPin, resolveAgentUserId } from "@/lib/agent-lines"
import { runAgentChat } from "@/lib/agent-chat"
import { appendCallTurn, getCallHistory } from "@/lib/twilio-call-session"
import {
  buildGatherTwiml,
  buildRedirectTwiml,
} from "@/lib/twilio-client"
import { getTwilioGatherWebhookUrl, getTwilioVoiceWebhookUrl } from "@/lib/twilio-config"

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const mode = request.nextUrl.searchParams.get("mode") ?? "speech"
  const userIdParam = request.nextUrl.searchParams.get("userId")
  const caller = formValue(formData, "From")
  const called = formValue(formData, "To")
  const digits = formValue(formData, "Digits")

  if (mode === "pin") {
    const line = digits ? getLineByPin(digits) : undefined
    if (!line) {
      const twiml = buildGatherTwiml(
        "That PIN is not valid. Goodbye.",
        getTwilioGatherWebhookUrl(undefined, "speech"),
        true,
      )
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
    }
    const twiml = buildRedirectTwiml(getTwilioVoiceWebhookUrl(line.userId))
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
  }

  const speechResult = formValue(formData, "SpeechResult")
  const callSid = formValue(formData, "CallSid")
  const agentUserId =
    resolveAgentUserId({ userIdParam, callerPhone: caller, calledNumber: called }) ??
    "phone_unknown"
  const gatherUrl = getTwilioGatherWebhookUrl(agentUserId, "speech")

  if (!speechResult) {
    const twiml = buildGatherTwiml(
      "Sorry, I didn't catch that. Please try again.",
      gatherUrl,
    )
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
  }

  const history = getCallHistory(callSid)

  try {
    const messages = [...history, { role: "user" as const, content: speechResult }]
    const { reply } = await runAgentChat(agentUserId, messages)
    appendCallTurn(callSid, speechResult, reply)

    const lower = speechResult.toLowerCase()
    const endCall =
      lower.includes("goodbye") ||
      lower.includes("bye") ||
      lower.includes("hang up")

    const twiml = buildGatherTwiml(reply || "Done.", gatherUrl, endCall)
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
  } catch (error) {
    console.error("Twilio gather error:", error)
    const twiml = buildGatherTwiml(
      "Something went wrong on my side. Try asking again in a moment.",
      gatherUrl,
    )
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
  }
}
