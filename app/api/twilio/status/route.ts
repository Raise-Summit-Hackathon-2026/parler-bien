import { NextResponse } from "next/server"

import { configureTwilioVoiceWebhook } from "@/lib/twilio-client"
import {
  getTwilioCredentials,
  getTwilioPublicBaseUrl,
  getTwilioVoiceWebhookUrl,
  isPublicAppUrl,
  isTwilioReachable,
} from "@/lib/twilio-config"

export async function GET() {
  const creds = getTwilioCredentials()
  if (!creds) {
    return NextResponse.json({ configured: false, error: "Twilio credentials missing" })
  }

  return NextResponse.json({
    configured: true,
    phoneNumber: creds.phoneNumber ?? null,
    europePhoneNumber: process.env.TWILIO_EUROPE_PHONE_NUMBER ?? "+41445054446",
    voiceWebhookUrl: getTwilioVoiceWebhookUrl(),
    tunnelUrl: process.env.PUBLIC_TUNNEL_URL?.trim() || null,
    publicBaseUrl: getTwilioPublicBaseUrl(),
    publicUrl: isPublicAppUrl(),
    reachable: isTwilioReachable(),
    canConfigureWebhooks: isPublicAppUrl() && Boolean(creds.phoneNumberSid),
  })
}

export async function POST() {
  try {
    const result = await configureTwilioVoiceWebhook()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Configure failed" },
      { status: 400 },
    )
  }
}
