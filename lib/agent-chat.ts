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

export async function runAgentChat(
  userId: string,
  messages: AgentChatMessage[],
): Promise<{ reply: string; toolsUsed: string[] }> {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (!openRouterKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  const { AGENT_SYSTEM_PROMPT, AGENT_TOOLKIT_SLUGS } = await import("@/lib/agent-config")
  const { getComposio } = await import("@/lib/composio")

  const composio = getComposio()
  const tools = await composio.tools.get(userId, {
    toolkits: AGENT_TOOLKIT_SLUGS,
    limit: 40,
  })

  const conversation: OpenRouterMessage[] = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const toolsUsed: string[] = []

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
      choices: Array<{
        message: {
          role: "assistant"
          content: string | null
          tool_calls?: OpenRouterToolCall[]
        }
      }>
    }

    const assistantMessage = data.choices[0]?.message
    if (!assistantMessage) {
      throw new Error("Empty model response")
    }

    if (!assistantMessage.tool_calls?.length) {
      return {
        reply: assistantMessage.content ?? "",
        toolsUsed,
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
  }
}
