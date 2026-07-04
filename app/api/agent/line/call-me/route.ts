import { NextResponse } from "next/server"

import { getLineByUserId } from "@/lib/agent-lines"
import { createAgentPhoneOutboundCall } from "@/lib/agentphone-client"
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
        { error: "Deploy your enterprise agent first." },
        { status: 400 },
      )
    }

    if (line.telephonyProvider === "agentphone" && line.agentPhoneAgentId) {
      await createAgentPhoneOutboundCall({
        agentId: line.agentPhoneAgentId,
        toNumber: line.userPhone,
        fromNumberId: line.agentPhoneNumberId,
        initialGreeting: `Hi, this is ${line.agentName ?? "your enterprise agent"}.`,
      })

      return NextResponse.json({
        ok: true,
        provider: "agentphone",
        to: line.userPhone,
        message: "Calling the owner via AgentPhone — answer to talk to your deployed agent.",
      })
    }

    const creds = getTwilioCredentials()
    const fromNumber = line.dedicatedPhoneNumber ?? creds?.phoneNumber
    if (!fromNumber) {
      return NextResponse.json({ error: "Telephony is not configured" }, { status: 503 })
    }

    const client = getTwilioClient()
    const voiceUrl = `${getTwilioPublicBaseUrl()}/api/twilio/voice?userId=${encodeURIComponent(userId)}`

    const call = await client.calls.create({
      to: line.userPhone,
      from: fromNumber,
      url: voiceUrl,
      method: "POST",
    })

    return NextResponse.json({
      ok: true,
      provider: "twilio",
      callSid: call.sid,
      to: line.userPhone,
      message: "Calling the owner now — answer to talk to your agent.",
    })
  } catch (error) {
    console.error("Call-me error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start call" },
      { status: 500 },
    )
  }
}
