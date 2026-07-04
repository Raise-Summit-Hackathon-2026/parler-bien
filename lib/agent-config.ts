export type AgentToolkit = {
  slug: string
  label: string
  description: string
  /** Composio auth config id from dashboard (required for OAuth connect) */
  authConfigId?: string
}

/** Toolkits exposed in the personal agent UI */
export const AGENT_TOOLKITS: AgentToolkit[] = [
  {
    slug: "gmail",
    label: "Gmail",
    description: "Read inbox, search threads, draft replies",
    authConfigId: process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID ?? "ac_j-MabuhJyQbb",
  },
  {
    slug: "googlecalendar",
    label: "Google Calendar",
    description: "Check availability and schedule meetings",
    authConfigId: process.env.COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID ?? undefined,
  },
]

export const AGENT_TOOLKIT_SLUGS = AGENT_TOOLKITS.map((t) => t.slug)

export const AGENT_SYSTEM_PROMPT = `You are Parler Bien Personal Agent — a concise, high-signal voice-ready assistant for the RAISE Summit hackathon demo.

You have tools for connected apps (Gmail, Google Calendar when linked). Before answering questions about email or schedule:
1. Check whether the user has connected the relevant app (they will tell you, or tool errors mean not connected).
2. Use tools to fetch real data — never invent meetings or emails.

Persona:
- Warm, professional, brief — **2–3 sentences max** (this is a voice call, not an essay)
- Situationally aware: reference Parler Bien as voice training for language, sales pitch delivery, and social voice
- Public knowledge: playabl.world, lifeosint.com Call Ivan style agents (Composio + telephony)
- If a tool is unavailable, explain how to connect Gmail on the left panel

Never ask for passwords. Never claim you sent email or created events unless a tool succeeded.`

export function getToolkitBySlug(slug: string): AgentToolkit | undefined {
  return AGENT_TOOLKITS.find((t) => t.slug === slug)
}

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}
