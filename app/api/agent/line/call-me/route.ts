import { NextResponse } from "next/server"

import { getLineByUserId } from "@/lib/agent-lines"
import { getAgentUserId } from "@/lib/composio"
import { getTwilioClient } from "@/lib/twilio-client"
import { getTwilioCredentials, getTwilioPublicBaseUrl } from "@/lib/twilio-config"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string }
    const userId = getAgentUserId(body.userId)
    const line = getLineByUserId(userId)

    if (!line) {
      return NextResponse.json(
        { error: "Create your agent line first (add your phone number)." },
        { status: 400 },
      )
    }

    const creds = getTwilioCredentials()
    if (!creds?.phoneNumber) {
      return NextResponse.json({ error: "Twilio is not configured" }, { status: 503 })
    }

    const client = getTwilioClient()
    const voiceUrl = `${getTwilioPublicBaseUrl()}/api/twilio/voice?userId=${encodeURIComponent(userId)}`

    const call = await client.calls.create({
      to: line.userPhone,
      from: creds.phoneNumber,
      url: voiceUrl,
      method: "POST",
    })

    return NextResponse.json({
      ok: true,
      callSid: call.sid,
      to: line.userPhone,
      message: "Calling your phone now — answer to talk to your agent.",
    })
  } catch (error) {
    console.error("Call-me error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start call" },
      { status: 500 },
    )
  }
}
