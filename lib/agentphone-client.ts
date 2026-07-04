import { getTwilioPublicBaseUrl } from "@/lib/twilio-config"

const DEFAULT_BASE = "https://api.agentphone.ai/v1"

export function getAgentPhoneApiKey(): string | undefined {
  return process.env.AGENTPHONE_API_KEY?.trim()
}

export function isAgentPhoneConfigured(): boolean {
  return Boolean(getAgentPhoneApiKey())
}

export function getAgentPhoneWebhookUrl(): string {
  return `${getTwilioPublicBaseUrl()}/api/agentphone/webhook`
}

type AgentPhoneAgent = {
  id: string
  name: string
  voiceMode?: string
}

type AgentPhoneNumber = {
  id: string
  phoneNumber: string
  country?: string
  status?: string
  agentId?: string | null
}

async function agentPhoneRequest<T>(
  path: string,
  options: { method?: string; jsonBody?: unknown; headers?: HeadersInit } = {},
): Promise<T> {
  const apiKey = getAgentPhoneApiKey()
  if (!apiKey) throw new Error("AGENTPHONE_API_KEY is not configured")

  const base = process.env.AGENTPHONE_BASE_URL?.trim() || DEFAULT_BASE
  const response = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    },
    body: options.jsonBody !== undefined ? JSON.stringify(options.jsonBody) : undefined,
  })

  const payload = (await response.json()) as T & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `AgentPhone API error (${response.status})`)
  }
  return payload
}

export async function listAgentPhoneNumbers(): Promise<AgentPhoneNumber[]> {
  const payload = await agentPhoneRequest<{ data?: AgentPhoneNumber[] }>("/numbers")
  return payload.data ?? []
}

export async function createAgentPhoneAgent(input: {
  name: string
  description?: string
  beginMessage?: string
}): Promise<AgentPhoneAgent> {
  return agentPhoneRequest<AgentPhoneAgent>("/agents", {
    method: "POST",
    jsonBody: {
      name: input.name,
      description: input.description,
      voiceMode: "webhook",
      enableMessaging: true,
      beginMessage: input.beginMessage ?? "Hello, how can I help?",
      language: "en-US",
    },
  })
}

export async function updateAgentPhoneAgent(
  agentId: string,
  input: { name?: string; beginMessage?: string; voiceMode?: string; enableMessaging?: boolean },
): Promise<AgentPhoneAgent> {
  return agentPhoneRequest<AgentPhoneAgent>(`/agents/${agentId}`, {
    method: "PATCH",
    jsonBody: input,
  })
}

export async function buyAgentPhoneNumber(): Promise<AgentPhoneNumber> {
  return agentPhoneRequest<AgentPhoneNumber>("/numbers", {
    method: "POST",
    jsonBody: {},
  })
}

export async function attachAgentPhoneNumber(
  agentId: string,
  numberId: string,
): Promise<unknown> {
  return agentPhoneRequest(`/agents/${agentId}/numbers`, {
    method: "POST",
    jsonBody: { numberId },
  })
}

export async function setAgentPhoneWebhook(
  agentId: string,
  url: string,
): Promise<{ secret?: string }> {
  return agentPhoneRequest<{ secret?: string }>(`/agents/${agentId}/webhook`, {
    method: "POST",
    jsonBody: { url, contextLimit: 10, timeout: 60 },
  })
}

export async function createAgentPhoneOutboundCall(input: {
  agentId: string
  toNumber: string
  fromNumberId?: string
  initialGreeting?: string
}): Promise<{ id?: string }> {
  return agentPhoneRequest("/calls", {
    method: "POST",
    jsonBody: {
      agentId: input.agentId,
      toNumber: input.toNumber,
      fromNumberId: input.fromNumberId,
      initialGreeting: input.initialGreeting,
    },
  })
}

export async function sendAgentPhoneMessage(input: {
  agentId: string
  toNumber: string
  body: string
  numberId?: string
}): Promise<unknown> {
  return agentPhoneRequest("/messages", {
    method: "POST",
    jsonBody: {
      agent_id: input.agentId,
      to_number: input.toNumber,
      body: input.body,
      number_id: input.numberId,
    },
  })
}
