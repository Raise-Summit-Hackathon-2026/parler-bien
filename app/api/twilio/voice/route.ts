import { NextRequest, NextResponse } from "next/server"

import { getLineByDedicatedNumber, getLineByUserId, resolveAgentUserId } from "@/lib/agent-lines"
import {
  buildGatherTwiml,
  buildPinPromptTwiml,
  buildWelcomeTwiml,
} from "@/lib/twilio-client"
import { getTwilioGatherWebhookUrl, getTwilioVoiceWebhookUrl } from "@/lib/twilio-config"

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const caller = formValue(formData, "From")
  const called = formValue(formData, "To")
  const userIdParam = request.nextUrl.searchParams.get("userId")

  let agentUserId = resolveAgentUserId({
    userIdParam,
    callerPhone: caller,
    calledNumber: called,
  })

  if (!agentUserId && called) {
    const blocked = getLineByDedicatedNumber(called)
    if (blocked) {
      const twiml = buildGatherTwiml(
        "This business line is restricted to approved callers only.",
        getTwilioGatherWebhookUrl(undefined, "speech"),
        true,
      )
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
    }
  }

  if (!agentUserId) {
    const twiml = buildPinPromptTwiml(getTwilioGatherWebhookUrl(undefined, "pin"))
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
  }

  const line = getLineByUserId(agentUserId)
  const twiml = buildWelcomeTwiml(
    getTwilioGatherWebhookUrl(agentUserId, "speech"),
    line?.agentName ?? line?.displayName,
  )
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
