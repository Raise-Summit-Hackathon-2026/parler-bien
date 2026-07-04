export type AgentToolkit = {
  slug: string
  label: string
  description: string
  /** Optional auth config id override from env / dashboard */
  authConfigId?: string
  /** Shown when Composio has no managed connect flow yet */
  connectHint?: string
}

/** Toolkits exposed in the personal agent UI */
export const AGENT_TOOLKITS: AgentToolkit[] = [
  {
    slug: "gmail",
    label: "Gmail",
    description: "Read inbox, search threads, draft replies",
  },
  {
    slug: "googlecalendar",
    label: "Google Calendar",
    description: "Check availability and upcoming events",
  },
  {
    slug: "googledrive",
    label: "Google Drive",
    description: "Find and read files in your Drive",
  },
  {
    slug: "outlook",
    label: "Outlook",
    description: "Microsoft email and calendar",
  },
  {
    slug: "one_drive",
    label: "OneDrive",
    description: "Browse and search cloud files",
  },
  {
    slug: "microsoft_teams",
    label: "Microsoft Teams",
    description: "Teams messages and meetings",
  },
  {
    slug: "whatsapp",
    label: "WhatsApp Business",
    description: "Business messaging (Meta Business account)",
  },
  {
    slug: "telegram",
    label: "Telegram",
    description: "Bot API — add bot token in composio.dev first",
    connectHint: "Create a Telegram auth config with your bot token at composio.dev → Auth configs.",
  },
]

export const AGENT_TOOLKIT_SLUGS = AGENT_TOOLKITS.map((t) => t.slug)

export const AGENT_SYSTEM_PROMPT = `You are Parler Bien Personal Agent — a concise, high-signal voice-ready assistant for the RAISE Summit hackathon demo.

You have tools for connected apps (Gmail, Google Calendar, Google Drive, Outlook, OneDrive, Teams, WhatsApp when linked). Before answering about email, calendar, files, or messages:
1. Use tools to fetch real data — never invent meetings, emails, or files.
2. If a tool fails, tell the user which app to connect on the left panel.

Persona:
- Warm, professional, brief — **2–3 sentences max** (voice call, not an essay)
- Situationally aware: Parler Bien = voice training for language, sales pitch, social voice
- Public knowledge: playabl.world, lifeosint.com Call Ivan style agents (Composio + telephony)

Never ask for passwords. Never claim you sent email, created events, or read files unless a tool succeeded.`

export function getToolkitBySlug(slug: string): AgentToolkit | undefined {
  return AGENT_TOOLKITS.find((t) => t.slug === slug)
}

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export function getGoogleOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/api/composio/oauth/callback`
}
