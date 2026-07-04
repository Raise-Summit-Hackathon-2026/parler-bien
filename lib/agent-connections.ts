import { AGENT_TOOLKITS } from "@/lib/agent-config"
import { getComposio } from "@/lib/composio"

const PROBE_TOOLS: Partial<Record<string, string>> = {
  gmail: "GMAIL_FETCH_EMAILS",
  googlecalendar: "GOOGLECALENDAR_EVENTS_LIST",
  googledrive: "GOOGLEDRIVE_LIST_FILES",
}

export type ConnectedToolkit = {
  slug: string
  label: string
  connectionId: string
}

export async function getConnectedToolkits(userId: string): Promise<ConnectedToolkit[]> {
  const composio = getComposio()
  const accounts = await composio.connectedAccounts.list({ userIds: [userId] })
  const active = (accounts.items ?? []).filter((a) => a.status === "ACTIVE")

  return AGENT_TOOLKITS.flatMap((toolkit) => {
    const connection = active.find(
      (a) => (a.toolkit?.slug ?? a.toolkit) === toolkit.slug,
    )
    if (!connection) return []
    return [
      {
        slug: toolkit.slug,
        label: toolkit.label,
        connectionId: connection.id,
      },
    ]
  })
}

export async function probeToolkitHealth(
  userId: string,
  slug: string,
): Promise<{ ok: boolean; error?: string }> {
  const toolName = PROBE_TOOLS[slug]
  if (!toolName) return { ok: true }

  try {
    const composio = getComposio()
    const result = await composio.tools.execute(toolName, {
      userId,
      arguments: slug === "gmail" ? { max_results: 1 } : { maxResults: 1 },
      dangerouslySkipVersionCheck: true,
    })

    const payload = result as { successful?: boolean; error?: string; data?: { message?: string } }
    if (payload.successful === false) {
      return { ok: false, error: payload.error ?? payload.data?.message ?? "Tool probe failed" }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Tool probe failed",
    }
  }
}

export function buildAgentSystemPrompt(connectedLabels: string[]): string {
  const connectedLine =
    connectedLabels.length > 0
      ? `Connected data sources for this deployment: ${connectedLabels.join(", ")}.`
      : "No enterprise data sources connected yet."

  return `You are Parler Bien Enterprise Agent — a concise, professional voice and messaging assistant for employees and approved callers.

${connectedLine}

Before answering about email, calendar, files, or messages:
1. If a source is connected, ALWAYS call the relevant tool first — never guess.
2. If a tool fails, explain the real error. Do NOT tell the user to reconnect when already connected.
3. If not connected, tell them to connect it in the deployment panel.

Enterprise rules:
- You serve one deployed agent identity (sales, support, executive, ops).
- Be brief — 2–3 sentences on voice/SMS unless asked for detail.
- Never share data with unverified callers; stay within the employee's connected tools.
- Never claim you sent email, booked meetings, or read files unless a tool succeeded.

Never ask for passwords.`
}
