import { NextResponse } from "next/server"

import { getAgentUserId } from "@/lib/composio"
import { provisionAgentPhoneLine } from "@/lib/agentphone-provision"
import { isAgentPhoneConfigured } from "@/lib/agentphone-client"
import { getLineByUserId } from "@/lib/agent-lines"
import { getSharedLineFallback, provisionDedicatedNumber } from "@/lib/twilio-provision"
import { isTwilioReachable } from "@/lib/twilio-config"

export async function provisionBusinessLine(userId: string) {
  if (isAgentPhoneConfigured()) {
    return provisionAgentPhoneLine(userId)
  }
  return provisionDedicatedNumber(userId)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = getAgentUserId(searchParams.get("userId"))
  const line = getLineByUserId(userId)

  return NextResponse.json({
    userId,
    line,
    telephonyProvider: isAgentPhoneConfigured() ? "agentphone" : "twilio",
    agentPhoneConfigured: isAgentPhoneConfigured(),
    canProvision: Boolean(line && (isAgentPhoneConfigured() || isTwilioReachable())),
    reachable: isTwilioReachable(),
    sharedNumbers: getSharedLineFallback(),
    dedicated: line?.dedicatedPhoneNumber
      ? {
          phoneNumber: line.dedicatedPhoneNumber,
          provider: line.telephonyProvider ?? (isAgentPhoneConfigured() ? "agentphone" : "twilio"),
          whatsappStatus: line.whatsappStatus ?? "voice_sms_ready",
        }
      : null,
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string }
    const userId = getAgentUserId(body.userId)
    const result = await provisionBusinessLine(userId)
    const line = getLineByUserId(userId)

    return NextResponse.json({
      ok: true,
      userId,
      line,
      ...result,
      channels: {
        voice: result.phoneNumber,
        sms: result.phoneNumber,
        whatsappBusiness: result.phoneNumber,
      },
    })
  } catch (error) {
    console.error("Provision number error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to provision number" },
      { status: 500 },
    )
  }
}
