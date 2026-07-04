import {
  getLineByUserId,
  setTelephonyLine,
  type WhatsAppStatus,
} from "@/lib/agent-lines"
import {
  attachAgentPhoneNumber,
  buyAgentPhoneNumber,
  createAgentPhoneAgent,
  getAgentPhoneWebhookUrl,
  isAgentPhoneConfigured,
  listAgentPhoneNumbers,
  setAgentPhoneWebhook,
  updateAgentPhoneAgent,
} from "@/lib/agentphone-client"
import { isTwilioReachable } from "@/lib/twilio-config"

export type TelephonyProvisionResult = {
  phoneNumber: string
  phoneNumberSid: string
  whatsappStatus: WhatsAppStatus
  whatsappNote?: string
  provider: "agentphone" | "twilio"
  agentPhoneAgentId?: string
  agentPhoneNumberId?: string
}

export async function provisionAgentPhoneLine(userId: string): Promise<TelephonyProvisionResult> {
  if (!isTwilioReachable()) {
    throw new Error(
      "AgentPhone webhooks need a public URL. Run npm run tunnel, set PUBLIC_TUNNEL_URL, restart dev — or deploy.",
    )
  }

  const line = getLineByUserId(userId)
  if (!line) {
    throw new Error("Deploy your enterprise agent first.")
  }

  if (line.dedicatedPhoneNumber && line.agentPhoneAgentId) {
    await setAgentPhoneWebhook(line.agentPhoneAgentId, getAgentPhoneWebhookUrl())
    return {
      phoneNumber: line.dedicatedPhoneNumber,
      phoneNumberSid: line.agentPhoneNumberId ?? line.twilioPhoneSid ?? "",
      whatsappStatus: line.whatsappStatus ?? "voice_sms_ready",
      provider: "agentphone",
      agentPhoneAgentId: line.agentPhoneAgentId,
      agentPhoneNumberId: line.agentPhoneNumberId,
    }
  }

  const existingNumbers = await listAgentPhoneNumbers().catch(() => [] as Awaited<ReturnType<typeof listAgentPhoneNumbers>>)
  const linked = existingNumbers.find((n) => n.agentId && n.status === "active")

  if (linked?.agentId) {
    await updateAgentPhoneAgent(linked.agentId, {
      name: line.agentName ?? `Parler Bien · ${line.workspaceName ?? userId}`,
      beginMessage: `Hi, this is ${line.agentName ?? "your enterprise agent"}. How can I help?`,
      voiceMode: "webhook",
      enableMessaging: true,
    })
    await setAgentPhoneWebhook(linked.agentId, getAgentPhoneWebhookUrl())

    setTelephonyLine(userId, {
      dedicatedPhoneNumber: linked.phoneNumber,
      telephonyProvider: "agentphone",
      agentPhoneAgentId: linked.agentId,
      agentPhoneNumberId: linked.id,
      whatsappStatus: "voice_sms_ready",
    })

    return {
      phoneNumber: linked.phoneNumber,
      phoneNumberSid: linked.id,
      whatsappStatus: "voice_sms_ready",
      whatsappNote:
        "Reused your existing AgentPhone number. Voice + SMS work; WhatsApp requires enablement on your AgentPhone account.",
      provider: "agentphone",
      agentPhoneAgentId: linked.agentId,
      agentPhoneNumberId: linked.id,
    }
  }

  const agent = await createAgentPhoneAgent({
    name: line.agentName ?? `Parler Bien · ${line.workspaceName ?? userId}`,
    description: `${line.agentRole ?? "executive"} agent for ${line.workspaceName ?? "enterprise deployment"}`,
    beginMessage: `Hi, this is ${line.agentName ?? "your enterprise agent"}. How can I help?`,
  })

  const number = await buyAgentPhoneNumber()
  await attachAgentPhoneNumber(agent.id, number.id)
  await setAgentPhoneWebhook(agent.id, getAgentPhoneWebhookUrl())

  setTelephonyLine(userId, {
    dedicatedPhoneNumber: number.phoneNumber,
    telephonyProvider: "agentphone",
    agentPhoneAgentId: agent.id,
    agentPhoneNumberId: number.id,
    whatsappStatus: "voice_sms_ready",
  })

  return {
    phoneNumber: number.phoneNumber,
    phoneNumberSid: number.id,
    whatsappStatus: "voice_sms_ready",
    whatsappNote: "Voice + SMS via AgentPhone. WhatsApp Business registers through AgentPhone when enabled on your account.",
    provider: "agentphone",
    agentPhoneAgentId: agent.id,
    agentPhoneNumberId: number.id,
  }
}

export function getTelephonyProvider(): "agentphone" | "twilio" {
  return isAgentPhoneConfigured() ? "agentphone" : "twilio"
}
