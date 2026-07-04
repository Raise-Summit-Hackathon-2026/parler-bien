import { NextResponse } from "next/server"

import { generateSituationalWelcome } from "@/lib/agent-chat"
import { getLineByUserId } from "@/lib/agent-lines"
import { createAgentPhoneOutboundCall } from "@/lib/agentphone-client"
import { getAgentUserId } from "@/lib/composio"
import { getTwilioClient } from "@/lib/twilio-client"
import { getTwilioCredentials, getTwilioPublicBaseUrl } from "@/lib/twilio-config"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string; delaySeconds?: number }
    const userId = getAgentUserId(body.userId)
    const line = getLineByUserId(userId)

    if (!line) {
      return NextResponse.json(
        { error: "Create your agent first — name and mobile number." },
        { status: 400 },
      )
    }

    const delaySeconds = Math.min(Math.max(body.delaySeconds ?? 0, 0), 300)

    const scheduleCall = async () => {
      const welcome = await generateSituationalWelcome(userId, {
        agentName: line.agentName,
        ownerName: line.agentName,
        direction: "outbound",
      })

      if (line.telephonyProvider === "agentphone" && line.agentPhoneAgentId) {
        await createAgentPhoneOutboundCall({
          agentId: line.agentPhoneAgentId,
          toNumber: line.userPhone,
          fromNumberId: line.agentPhoneNumberId,
          initialGreeting: welcome,
        })

        return {
          ok: true as const,
          provider: "agentphone" as const,
          to: line.userPhone,
          welcomePreview: welcome,
          message:
            delaySeconds > 0
              ? `Scheduled — your phone should ring in about ${delaySeconds} seconds with a personalized opening.`
              : "Calling you now with a personalized opening based on your connected data.",
        }
      }

      const creds = getTwilioCredentials()
      const fromNumber = line.dedicatedPhoneNumber ?? creds?.phoneNumber
      if (!fromNumber) {
        throw new Error("Telephony is not configured")
      }

      const client = getTwilioClient()
      const voiceUrl = `${getTwilioPublicBaseUrl()}/api/twilio/voice?userId=${encodeURIComponent(userId)}&welcome=${encodeURIComponent(welcome)}`

      const call = await client.calls.create({
        to: line.userPhone,
        from: fromNumber,
        url: voiceUrl,
        method: "POST",
      })

      return {
        ok: true as const,
        provider: "twilio" as const,
        callSid: call.sid,
        to: line.userPhone,
        welcomePreview: welcome,
        message:
          delaySeconds > 0
            ? `Scheduled — your phone should ring in about ${delaySeconds} seconds.`
            : "Calling you now with a personalized opening.",
      }
    }

    if (delaySeconds > 0) {
      void sleep(delaySeconds * 1000).then(scheduleCall).catch((error) => {
        console.error("Scheduled call-me error:", error)
      })

      return NextResponse.json({
        ok: true,
        scheduled: true,
        delaySeconds,
        message: `Callback scheduled in ${delaySeconds} seconds — we'll use your inbox and calendar for the opening.`,
      })
    }

    const result = await scheduleCall()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Call-me error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start call" },
      { status: 500 },
    )
  }
}
