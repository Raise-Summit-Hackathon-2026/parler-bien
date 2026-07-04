import { getLineByUserId, setTelephonyLine, type WhatsAppStatus } from "@/lib/agent-lines"
import { getTwilioClient } from "@/lib/twilio-client"
import {
  getTwilioCredentials,
  getTwilioMessagingWebhookUrl,
  getTwilioPublicBaseUrl,
  getTwilioVoiceWebhookUrl,
  isTwilioReachable,
} from "@/lib/twilio-config"

export type ProvisionResult = {
  phoneNumber: string
  phoneNumberSid: string
  whatsappStatus: WhatsAppStatus
  whatsappNote?: string
  provider: "twilio"
}

function canPurchaseNumbers(): boolean {
  return process.env.TWILIO_ALLOW_NUMBER_PURCHASE?.trim() !== "false"
}

async function registerWhatsAppSender(
  phoneNumber: string,
  profileName: string,
): Promise<{ status: WhatsAppStatus; note?: string }> {
  const wabaId = process.env.TWILIO_WABA_ID?.trim()
  if (!wabaId) {
    return {
      status: "voice_sms_ready",
      note: "Phone and SMS are live. Add TWILIO_WABA_ID in env to register WhatsApp on this number.",
    }
  }

  const creds = getTwilioCredentials()
  if (!creds) {
    return { status: "voice_sms_ready", note: "Twilio credentials missing for WhatsApp registration." }
  }

  try {
    const auth = Buffer.from(`${creds.apiKeySid}:${creds.apiKeySecret}`).toString("base64")
    const response = await fetch("https://messaging.twilio.com/v2/Channels/Senders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_id: `whatsapp:${phoneNumber}`,
        profile: { name: profileName.slice(0, 60) || "Parler Bien Agent" },
        configuration: { waba_id: wabaId },
        webhook: {
          callback_url: getTwilioMessagingWebhookUrl(),
          callback_method: "POST",
        },
      }),
    })

    const payload = (await response.json()) as { status?: string; message?: string }
    if (!response.ok) {
      return {
        status: "voice_sms_ready",
        note: payload.message ?? "WhatsApp registration started — complete verification in Twilio Console.",
      }
    }

    const senderStatus = payload.status?.toLowerCase()
    if (senderStatus === "online" || senderStatus === "active") {
      return { status: "whatsapp_online" }
    }

    return {
      status: "whatsapp_pending",
      note: "WhatsApp sender registered — finish Meta verification in Twilio Console if prompted.",
    }
  } catch (error) {
    return {
      status: "voice_sms_ready",
      note: error instanceof Error ? error.message : "WhatsApp registration failed",
    }
  }
}

export async function provisionDedicatedNumber(userId: string): Promise<ProvisionResult> {
  if (!isTwilioReachable()) {
    throw new Error(
      "Twilio needs a public URL. Run npm run tunnel, set PUBLIC_TUNNEL_URL, restart dev — or deploy to production.",
    )
  }

  const line = getLineByUserId(userId)
  if (!line) {
    throw new Error("Create your personal agent first (name + mobile number).")
  }

  if (line.dedicatedPhoneNumber && line.twilioPhoneSid) {
    return {
      phoneNumber: line.dedicatedPhoneNumber,
      phoneNumberSid: line.twilioPhoneSid,
      whatsappStatus: line.whatsappStatus ?? "voice_sms_ready",
      provider: "twilio",
    }
  }

  if (!canPurchaseNumbers()) {
    throw new Error("Number purchase is disabled. Set TWILIO_ALLOW_NUMBER_PURCHASE=true to enable.")
  }

  const client = getTwilioClient()
  const available = await client.availablePhoneNumbers("US").local.list({
    voiceEnabled: true,
    smsEnabled: true,
    limit: 1,
  })

  if (!available[0]?.phoneNumber) {
    throw new Error("No US phone numbers available on your Twilio account right now.")
  }

  const voiceUrl = getTwilioVoiceWebhookUrl()
  const messagingUrl = getTwilioMessagingWebhookUrl()

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    friendlyName: `Parler Bien · ${line.agentName ?? line.userId}`.slice(0, 64),
    voiceUrl,
    voiceMethod: "POST",
    smsUrl: messagingUrl,
    smsMethod: "POST",
  })

  const profileName = line.agentName ?? line.displayName ?? "Parler Bien Agent"
  const whatsapp = await registerWhatsAppSender(purchased.phoneNumber, profileName)

  setTelephonyLine(userId, {
    dedicatedPhoneNumber: purchased.phoneNumber,
    telephonyProvider: "twilio",
    twilioPhoneSid: purchased.sid,
    whatsappStatus: whatsapp.status,
  })

  return {
    phoneNumber: purchased.phoneNumber,
    phoneNumberSid: purchased.sid,
    whatsappStatus: whatsapp.status,
    whatsappNote: whatsapp.note,
    provider: "twilio",
  }
}

export function getSharedLineFallback() {
  return {
    us: process.env.TWILIO_PHONE_NUMBER?.trim() ?? null,
    europe: process.env.TWILIO_EUROPE_PHONE_NUMBER?.trim() ?? "+41445054446",
  }
}
