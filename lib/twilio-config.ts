import { getAppBaseUrl } from "@/lib/agent-config"

/** Public URL Twilio can reach — set when using localtunnel/ngrok on this machine */
export function getTwilioPublicBaseUrl(): string {
  return process.env.PUBLIC_TUNNEL_URL?.trim() || getAppBaseUrl()
}

export function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim()
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim()
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim()
  const phoneNumberSid = process.env.TWILIO_PHONE_NUMBER_SID?.trim()

  if (!accountSid || !apiKeySid || !apiKeySecret) return null

  return { accountSid, apiKeySid, apiKeySecret, phoneNumber, phoneNumberSid }
}

export function getTwilioVoiceWebhookUrl(agentUserId?: string): string {
  const base = `${getTwilioPublicBaseUrl()}/api/twilio/voice`
  return agentUserId ? `${base}?userId=${encodeURIComponent(agentUserId)}` : base
}

export function getTwilioGatherWebhookUrl(agentUserId?: string, mode?: "pin" | "speech"): string {
  const url = new URL(`${getTwilioPublicBaseUrl()}/api/twilio/gather`)
  if (agentUserId) url.searchParams.set("userId", agentUserId)
  if (mode) url.searchParams.set("mode", mode)
  return url.toString()
}

export function isPublicAppUrl(): boolean {
  const base = getAppBaseUrl()
  return !base.includes("localhost") && !base.includes("127.0.0.1")
}

export function isTwilioReachable(): boolean {
  return isPublicAppUrl() || Boolean(process.env.PUBLIC_TUNNEL_URL?.trim())
}

export function twilioUserId(callerNumber: string): string {
  const digits = callerNumber.replace(/\D/g, "")
  return digits ? `phone_${digits}` : "phone_unknown"
}
