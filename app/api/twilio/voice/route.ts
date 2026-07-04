import { NextRequest, NextResponse } from "next/server"

import { getLineByUserId, resolveAgentUserId } from "@/lib/agent-lines"
import {
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
  const userIdParam = request.nextUrl.searchParams.get("userId")

  let agentUserId = resolveAgentUserId({
    userIdParam,
    callerPhone: caller,
  })

  if (!agentUserId) {
    const twiml = buildPinPromptTwiml(getTwilioGatherWebhookUrl(undefined, "pin"))
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
  }

  const line = getLineByUserId(agentUserId)
  const twiml = buildWelcomeTwiml(
    getTwilioGatherWebhookUrl(agentUserId, "speech"),
    line?.displayName,
  )
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
