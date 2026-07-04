export type AgentChatMessage = {
  role: "user" | "assistant"
  content: string
}

type OpenRouterToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

type OpenRouterMessage = {
  role: "user" | "assistant" | "system" | "tool"
  content: string | null
  tool_call_id?: string
  tool_calls?: OpenRouterToolCall[]
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"
const MAX_TOOL_ROUNDS = 6

export type AgentChatUsage = {
  promptTokens: number
  completionTokens: number
  costUsd: number
}

export async function runAgentChat(
  userId: string,
  messages: AgentChatMessage[],
): Promise<{ reply: string; toolsUsed: string[]; usage: AgentChatUsage }> {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (!openRouterKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  const { AGENT_TOOLKIT_SLUGS } = await import("@/lib/agent-config")
  const { buildAgentSystemPrompt, getConnectedToolkits } = await import("@/lib/agent-connections")
  const { getComposio } = await import("@/lib/composio")

  const composio = getComposio()
  const connected = await getConnectedToolkits(userId)
  const connectedSlugs = connected.map((c) => c.slug)
  const tools = await composio.tools.get(userId, {
    toolkits: connectedSlugs.length ? connectedSlugs : AGENT_TOOLKIT_SLUGS,
    limit: 40,
  })

  const conversation: OpenRouterMessage[] = [
    {
      role: "system",
      content: buildAgentSystemPrompt(connected.map((c) => c.label)),
    },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const toolsUsed: string[] = []
  let promptTokens = 0
  let completionTokens = 0
  let costUsd = 0

  const { costFromOpenRouterUsage } = await import("@/lib/agent-usage")

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Parler Bien Agent",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: conversation,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? "auto" : undefined,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("OpenRouter agent error:", text)
      throw new Error("LLM request failed")
    }

    const data = (await response.json()) as {
      usage?: import("@/lib/agent-usage").OpenRouterUsage
      choices: Array<{
        message: {
          role: "assistant"
          content: string | null
          tool_calls?: OpenRouterToolCall[]
        }
      }>
    }

    const roundUsage = costFromOpenRouterUsage(data.usage, MODEL)
    promptTokens += roundUsage.promptTokens
    completionTokens += roundUsage.completionTokens
    costUsd += roundUsage.costUsd

    const assistantMessage = data.choices[0]?.message
    if (!assistantMessage) {
      throw new Error("Empty model response")
    }

    if (!assistantMessage.tool_calls?.length) {
      return {
        reply: assistantMessage.content ?? "",
        toolsUsed,
        usage: { promptTokens, completionTokens, costUsd },
      }
    }

    conversation.push({
      role: "assistant",
      content: assistantMessage.content,
      tool_calls: assistantMessage.tool_calls,
    })

    for (const toolCall of assistantMessage.tool_calls) {
      toolsUsed.push(toolCall.function.name)

      let argumentsParsed: Record<string, unknown> = {}
      try {
        argumentsParsed = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
      } catch {
        argumentsParsed = {}
      }

      const result = await composio.tools.execute(toolCall.function.name, {
        userId,
        arguments: argumentsParsed,
        dangerouslySkipVersionCheck: true,
      })

      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }
  }

  return {
    reply: "I hit the tool limit — try a simpler question.",
    toolsUsed,
    usage: { promptTokens, completionTokens, costUsd },
  }
}

export async function generateSituationalWelcome(
  userId: string,
  context: {
    agentName?: string
    ownerName?: string
    direction?: "outbound" | "inbound"
  } = {},
): Promise<string> {
  const agentName = context.agentName?.trim() || "your agent"
  const ownerName = context.ownerName?.trim() || "the owner"
  const direction = context.direction ?? "outbound"

  const prompt =
    direction === "outbound"
      ? `[Outbound callback — opening line only]
You are ${agentName}, calling ${ownerName} on their mobile. They just answered.

Write the first 2–3 sentences they hear — warm, spoken, no markdown.
- Use connected tools NOW to mention something timely from their inbox or calendar (urgent mail, next meeting, travel, etc.).
- Do NOT use a generic template like "Hi, this is X, how can I help?"
- If nothing is connected yet, say you're ready and mention they can connect Gmail and Calendar in the app.
- End with one short question to keep the conversation going.`
      : `[Inbound call — opening line only]
You are ${agentName}. Someone just called your number and you are picking up.

Write the first 2–3 spoken sentences — warm, no markdown.
- Use connected tools NOW to reference something timely from their inbox or calendar when possible.
- Avoid generic phone-tree greetings.
- If you cannot access life data yet, welcome them and offer to help once sources are connected.`

  const { reply } = await runAgentChat(userId, [{ role: "user", content: prompt }])
  const trimmed = reply.trim()
  return trimmed || `Hey ${ownerName}, it's ${agentName}. What should we tackle first?`
}
