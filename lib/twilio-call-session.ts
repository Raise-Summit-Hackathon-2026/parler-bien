import type { AgentChatMessage } from "@/lib/agent-chat"

const sessions = new Map<string, AgentChatMessage[]>()

export function getCallHistory(callSid: string): AgentChatMessage[] {
  return sessions.get(callSid) ?? []
}

export function appendCallTurn(
  callSid: string,
  userText: string,
  assistantText: string,
): AgentChatMessage[] {
  const history = [...(sessions.get(callSid) ?? [])]
  history.push({ role: "user", content: userText })
  history.push({ role: "assistant", content: assistantText })
  sessions.set(callSid, history.slice(-12))
  return sessions.get(callSid) ?? history
}

export function clearCallSession(callSid: string): void {
  sessions.delete(callSid)
}
