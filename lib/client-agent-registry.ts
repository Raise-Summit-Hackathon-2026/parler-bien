export type SavedPersonalAgent = {
  userId: string
  agentName: string
  phoneNumber?: string
  createdAt: string
}

const REGISTRY_KEY = "parler-bien-agent-registry"
const ACTIVE_KEY = "parler-bien-agent-user-id"

function readRegistry(): SavedPersonalAgent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedPersonalAgent[]
  } catch {
    return []
  }
}

function writeRegistry(agents: SavedPersonalAgent[]): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(agents))
}

export function getActiveAgentUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveAgentUserId(userId: string): void {
  localStorage.setItem(ACTIVE_KEY, userId)
}

export function listSavedAgents(): SavedPersonalAgent[] {
  return readRegistry().sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )
}

export function upsertSavedAgent(agent: SavedPersonalAgent): void {
  const agents = readRegistry()
  const index = agents.findIndex((a) => a.userId === agent.userId)
  if (index >= 0) {
    agents[index] = { ...agents[index], ...agent }
  } else {
    agents.unshift(agent)
  }
  writeRegistry(agents)
}

export function createNewAgentUserId(): string {
  const id = `pb_${crypto.randomUUID().slice(0, 12)}`
  setActiveAgentUserId(id)
  return id
}

/** Ensure legacy single-id users appear in the registry once. */
export function migrateLegacyActiveAgent(agentName?: string, phoneNumber?: string): void {
  const active = getActiveAgentUserId()
  if (!active) return
  const agents = readRegistry()
  if (agents.some((a) => a.userId === active)) return
  upsertSavedAgent({
    userId: active,
    agentName: agentName?.trim() || "My agent",
    phoneNumber,
    createdAt: new Date().toISOString(),
  })
}

export function removeSavedAgent(userId: string): void {
  writeRegistry(readRegistry().filter((a) => a.userId !== userId))
  if (getActiveAgentUserId() === userId) {
    localStorage.removeItem(ACTIVE_KEY)
  }
}
