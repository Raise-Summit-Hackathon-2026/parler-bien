import twilio from "twilio"

import {
  getTwilioCredentials,
  getTwilioVoiceWebhookUrl,
  isPublicAppUrl,
} from "@/lib/twilio-config"

export function getTwilioClient() {
  const creds = getTwilioCredentials()
  if (!creds) {
    throw new Error("Twilio is not configured")
  }

  return twilio(creds.apiKeySid, creds.apiKeySecret, {
    accountSid: creds.accountSid,
  })
}

export async function configureTwilioVoiceWebhook(): Promise<{
  phoneNumber: string
  voiceUrl: string
}> {
  const creds = getTwilioCredentials()
  if (!creds?.phoneNumberSid || !creds.phoneNumber) {
    throw new Error("TWILIO_PHONE_NUMBER and TWILIO_PHONE_NUMBER_SID are required")
  }

  if (!isPublicAppUrl()) {
    throw new Error(
      "Set NEXT_PUBLIC_APP_URL to your public URL (or use ngrok) before configuring Twilio webhooks",
    )
  }

  const voiceUrl = getTwilioVoiceWebhookUrl()
  const client = getTwilioClient()

  await client.incomingPhoneNumbers(creds.phoneNumberSid).update({
    voiceUrl,
    voiceMethod: "POST",
  })

  return { phoneNumber: creds.phoneNumber, voiceUrl }
}

export function buildWelcomeTwiml(gatherUrl: string, name?: string): string {
  const response = new twilio.twiml.VoiceResponse()
  const greeting = name
    ? `Hi ${name.split(" ")[0]}, I'm your Parler Bien agent. How can I help?`
    : "Hi, I'm Parler Bien, your personal voice agent. How can I help?"
  response.say({ voice: "Polly.Joanna" }, greeting)
  response.gather({
    input: ["speech"],
    action: gatherUrl,
    method: "POST",
    speechTimeout: "auto",
    language: "en-US",
  })
  response.say({ voice: "Polly.Joanna" }, "I didn't hear anything. Goodbye.")
  response.hangup()
  return response.toString()
}

export function buildPinPromptTwiml(gatherUrl: string): string {
  const response = new twilio.twiml.VoiceResponse()
  response.say(
    { voice: "Polly.Joanna" },
    "Welcome to Parler Bien. Enter your 4 digit agent PIN, then wait.",
  )
  response.gather({
    input: ["dtmf"],
    numDigits: 4,
    action: gatherUrl,
    method: "POST",
    timeout: 10,
  })
  response.say({ voice: "Polly.Joanna" }, "No PIN received. Goodbye.")
  response.hangup()
  return response.toString()
}

export function buildRedirectTwiml(url: string): string {
  const response = new twilio.twiml.VoiceResponse()
  response.redirect(url)
  return response.toString()
}

export function buildGatherTwiml(
  reply: string,
  gatherUrl: string,
  endCall = false,
): string {
  const response = new twilio.twiml.VoiceResponse()

  if (endCall) {
    response.say({ voice: "Polly.Joanna" }, sanitizeForSay(reply))
    response.hangup()
    return response.toString()
  }

  response.say({ voice: "Polly.Joanna" }, sanitizeForSay(reply))
  const gather = response.gather({
    input: ["speech"],
    action: gatherUrl,
    method: "POST",
    speechTimeout: "auto",
    language: "en-US",
  })
  gather.say({ voice: "Polly.Joanna" }, "Anything else?")
  response.say({ voice: "Polly.Joanna" }, "Goodbye.")
  response.hangup()
  return response.toString()
}

function sanitizeForSay(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600)
}
