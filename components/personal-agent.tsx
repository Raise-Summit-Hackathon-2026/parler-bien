"use client"

import { ArrowLeft, Bot, Link2, Loader2, Mic, Phone, Send, Square } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useId, useState } from "react"

import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useSpeaker } from "@/hooks/use-speaker"
import { getGoogleOAuthRedirectUri } from "@/lib/agent-config"
import { cn } from "@/lib/utils"

type ToolkitStatus = {
  slug: string
  label: string
  description: string
  connected: boolean
  working?: boolean | null
  workError?: string | null
  connectionId: string | null
  configured: boolean
  connectHint: string | null
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type TwilioStatus = {
  configured: boolean
  phoneNumber: string | null
  europePhoneNumber?: string
  voiceWebhookUrl: string
  tunnelUrl: string | null
  reachable: boolean
  publicUrl: boolean
  canConfigureWebhooks: boolean
}

type AgentLine = {
  lineId: string
  userId: string
  userPhone: string
  pin: string
  agentName?: string
  displayName?: string
  workspaceName?: string
  ownerEmail?: string
  agentRole?: string
  allowedCallerPhones?: string[]
  dedicatedPhoneNumber?: string
  twilioPhoneSid?: string
  telephonyProvider?: "agentphone" | "twilio"
  whatsappStatus?: string
  createdAt: string
}

type AgentChannels = {
  voice: string | null
  sms: string | null
  whatsappBusiness: string | null
}

type AgentDeployment = {
  agentId: string
  lineId: string
  workspace: string | null
  role: string
  inboundPolicy: string
}

type AgentLineResponse = {
  line: AgentLine | null
  channels?: AgentChannels
  deployment?: AgentDeployment
  sharedNumbers?: { us: string | null; europe: string | null }
  telephonyProvider?: "agentphone" | "twilio"
  agentPhoneConfigured?: boolean
  canProvision?: boolean
  error?: string
}

const VOICE_STARTERS = [
  "Summarize priority emails from the last 24 hours.",
  "What meetings do I have tomorrow and who are the attendees?",
  "Draft a follow-up to the latest procurement thread.",
  "Any calendar conflicts if I take a 3pm call with Acme?",
]

function getOrCreateUserId(storageKey: string): string {
  if (typeof window === "undefined") return "parler-bien-demo"
  const existing = localStorage.getItem(storageKey)
  if (existing) return existing
  const id = `pb_${crypto.randomUUID().slice(0, 12)}`
  localStorage.setItem(storageKey, id)
  return id
}

export function PersonalAgentPanel() {
  const storageKey = "parler-bien-agent-user-id"
  const [userId, setUserId] = useState("")
  const [toolkits, setToolkits] = useState<ToolkitStatus[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<"voice" | "text">("voice")
  const [phase, setPhase] = useState<"idle" | "listening" | "thinking" | "speaking">("idle")
  const [error, setError] = useState<string | null>(null)
  const [twilio, setTwilio] = useState<TwilioStatus | null>(null)
  const [agentLine, setAgentLine] = useState<AgentLine | null>(null)
  const [agentChannels, setAgentChannels] = useState<AgentChannels | null>(null)
  const [sharedNumbers, setSharedNumbers] = useState<{ us: string | null; europe: string | null } | null>(
    null,
  )
  const [agentNameInput, setAgentNameInput] = useState("")
  const [workspaceNameInput, setWorkspaceNameInput] = useState("")
  const [ownerEmailInput, setOwnerEmailInput] = useState("")
  const [agentRoleInput, setAgentRoleInput] = useState("executive")
  const [allowedCallersInput, setAllowedCallersInput] = useState("")
  const [userPhoneInput, setUserPhoneInput] = useState("")
  const [deployment, setDeployment] = useState<AgentDeployment | null>(null)
  const [creatingLine, setCreatingLine] = useState(false)
  const [provisioningNumber, setProvisioningNumber] = useState(false)
  const [callingMe, setCallingMe] = useState(false)
  const [telephonyProvider, setTelephonyProvider] = useState<"agentphone" | "twilio">("twilio")
  const [agentPhoneConfigured, setAgentPhoneConfigured] = useState(false)
  const [canProvisionLine, setCanProvisionLine] = useState(false)
  const [googleCloudProject, setGoogleCloudProject] = useState<string | null>(null)
  const listId = useId()

  const { isRecording, analyser: recorderAnalyser, error: micError, startRecording, stopRecording } =
    useAudioRecorder()
  const { isSpeaking, analyser: speakerAnalyser, speak, stop: stopSpeaking } = useSpeaker()

  const resolveUserId = useCallback(
    () => userId || getOrCreateUserId(storageKey),
    [storageKey, userId],
  )

  const loadStatus = useCallback(async (uid: string) => {
    setLoadingStatus(true)
    setError(null)
    try {
      const response = await fetch(`/api/agent/status?userId=${encodeURIComponent(uid)}`)
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to load connections")
      }
      const data = (await response.json()) as {
        toolkits: ToolkitStatus[]
        googleCloudProjectNumber?: string | null
      }
      setToolkits(data.toolkits)
      if (data.googleCloudProjectNumber) {
        setGoogleCloudProject(data.googleCloudProjectNumber)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status")
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    const uid = getOrCreateUserId(storageKey)
    setUserId(uid)
    void loadStatus(uid)
  }, [loadStatus, storageKey])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("connected") && userId) {
      void loadStatus(userId)
    }
  }, [loadStatus, userId])

  const loadAgentLine = useCallback(async (uid: string) => {
    try {
      const [lineRes, provisionRes] = await Promise.all([
        fetch(`/api/agent/line?userId=${encodeURIComponent(uid)}`),
        fetch(`/api/agent/line/provision?userId=${encodeURIComponent(uid)}`),
      ])
      const data = (await lineRes.json()) as AgentLineResponse
      const provision = (await provisionRes.json()) as AgentLineResponse
      setAgentLine(data.line)
      if (data.channels) setAgentChannels(data.channels)
      if (data.deployment) setDeployment(data.deployment)
      if (data.sharedNumbers) setSharedNumbers(data.sharedNumbers)
      setTelephonyProvider(provision.telephonyProvider ?? "twilio")
      setAgentPhoneConfigured(Boolean(provision.agentPhoneConfigured))
      setCanProvisionLine(Boolean(provision.canProvision))
      if (data.line?.agentName) setAgentNameInput(data.line.agentName)
      if (data.line?.workspaceName) setWorkspaceNameInput(data.line.workspaceName)
      if (data.line?.ownerEmail) setOwnerEmailInput(data.line.ownerEmail)
      if (data.line?.agentRole) setAgentRoleInput(data.line.agentRole)
      if (data.line?.allowedCallerPhones?.length) {
        setAllowedCallersInput(data.line.allowedCallerPhones.join(", "))
      }
      if (data.line?.userPhone) setUserPhoneInput(data.line.userPhone)
    } catch {
      setAgentLine(null)
    }
  }, [])

  useEffect(() => {
    void fetch("/api/twilio/status")
      .then((r) => r.json())
      .then((data: TwilioStatus) => setTwilio(data))
      .catch(() => setTwilio(null))
  }, [])

  useEffect(() => {
    if (userId) void loadAgentLine(userId)
  }, [loadAgentLine, userId])

  useEffect(() => {
    if (isRecording) setPhase("listening")
    else if (isSpeaking) setPhase("speaking")
    else if (phase === "listening" || phase === "speaking") setPhase("idle")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- phase transitions only
  }, [isRecording, isSpeaking])

  async function handleConnect(slug: string) {
    setConnecting(slug)
    setError(null)
    try {
      const response = await fetch("/api/agent/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit: slug, userId: resolveUserId() }),
      })
      const data = (await response.json()) as {
        redirectUrl?: string
        error?: string
        hint?: string
      }
      if (!response.ok || !data.redirectUrl) {
        throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error ?? "Connect failed")
      }
      window.location.href = data.redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed")
      setConnecting(null)
    }
  }

  async function handleVoiceTurn() {
    if (phase === "thinking") return

    if (isRecording) {
      setPhase("thinking")
      setError(null)
      const audio = await stopRecording()
      if (!audio) {
        setPhase("idle")
        setError("No audio captured.")
        return
      }

      try {
        const response = await fetch("/api/agent/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: resolveUserId(),
            audioBase64: audio.base64,
            audioFormat: audio.format,
            history: messages,
          }),
        })
        const data = (await response.json()) as {
          transcript?: string
          reply?: string
          messages?: ChatMessage[]
          error?: string
        }
        if (!response.ok || !data.reply || !data.transcript) {
          throw new Error(data.error ?? "Voice call failed")
        }
        setMessages(data.messages ?? [
          ...messages,
          { role: "user", content: data.transcript! },
          { role: "assistant", content: data.reply! },
        ])
        setPhase("speaking")
        await speak(data.reply, "coach", {
          gender: "female",
          ageRange: "30-40",
          tone: "Calm, concise personal agent. Professional briefing voice.",
          accent: "American English",
        })
        setPhase("idle")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Voice call failed")
        setPhase("idle")
      }
      return
    }

    stopSpeaking()
    setError(null)
    await startRecording()
  }

  async function handleCreateLine() {
    const phone = userPhoneInput.trim()
    const agentName = agentNameInput.trim()
    if (!phone || !agentName) return

    setCreatingLine(true)
    setError(null)
    try {
      const response = await fetch("/api/agent/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resolveUserId(),
          userPhone: phone,
          agentName,
          workspaceName: workspaceNameInput.trim() || undefined,
          ownerEmail: ownerEmailInput.trim() || undefined,
          agentRole: agentRoleInput,
          allowedCallerPhones: allowedCallersInput,
        }),
      })
      const data = (await response.json()) as AgentLineResponse
      if (!response.ok) throw new Error(data.error ?? "Failed to create personal agent")
      setAgentLine(data.line)
      if (data.channels) setAgentChannels(data.channels)
      if (data.deployment) setDeployment(data.deployment)
      if (data.sharedNumbers) setSharedNumbers(data.sharedNumbers)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create personal agent")
    } finally {
      setCreatingLine(false)
    }
  }

  async function handleProvisionNumber() {
    if (!agentLine) return

    setProvisioningNumber(true)
    setError(null)
    try {
      const response = await fetch("/api/agent/line/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resolveUserId() }),
      })
      const data = (await response.json()) as AgentLineResponse & {
        ok?: boolean
        whatsappNote?: string
        phoneNumber?: string
      }
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to get phone number")
      setAgentLine(data.line ?? agentLine)
      if (data.channels) setAgentChannels(data.channels)
      await loadAgentLine(resolveUserId())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision number")
    } finally {
      setProvisioningNumber(false)
    }
  }

  async function handleCallMe() {
    if (!userId || !agentLine) return

    setCallingMe(true)
    setError(null)
    try {
      const response = await fetch("/api/agent/line/call-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resolveUserId() }),
      })
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string }
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Call failed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Call failed")
    } finally {
      setCallingMe(false)
    }
  }

  async function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed || phase === "thinking") return

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }]
    setMessages(nextMessages)
    setInput("")
    setPhase("thinking")
    setError(null)

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resolveUserId(), messages: nextMessages }),
      })
      const data = (await response.json()) as { reply?: string; error?: string }
      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? "Chat failed")
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply! }])
      if (mode === "voice") {
        setPhase("speaking")
        await speak(data.reply, "coach", {
          gender: "female",
          ageRange: "30-40",
          tone: "Calm, concise personal agent.",
          accent: "American English",
        })
      }
      setPhase("idle")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed")
      setPhase("idle")
    }
  }

  const displayError = error ?? micError
  const waveformAnalyser = isRecording ? recorderAnalyser : speakerAnalyser
  const waveformActive = isRecording || isSpeaking
  const busy = phase === "thinking" || isSpeaking
  const gcpProject = googleCloudProject ?? "780417362460"
  const gmailToolkit = toolkits.find((t) => t.slug === "gmail")

  function toolkitBadge(toolkit: ToolkitStatus) {
    if (!toolkit.connected) {
      return { label: "Not linked", className: "bg-muted text-muted-foreground" }
    }
    if (toolkit.working === false) {
      return {
        label: "Setup needed",
        className: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      }
    }
    return {
      label: "Connected",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Use cases
      </Link>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Enterprise agents
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Deploy an enterprise agent</h1>
        <p className="max-w-2xl text-muted-foreground">
          AgentPhone-style B2B pattern: one deployed agent identity, Composio data sources, a dedicated
          business line (voice + SMS + WhatsApp Business), and an inbound allowlist — not a consumer
          WhatsApp contact.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="max-h-[70vh] space-y-4 overflow-y-auto rounded-3xl border bg-card p-5 shadow-sm lg:max-h-none">
          {twilio?.configured && (
            <div className="rounded-2xl border bg-background p-3 text-sm">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                <p className="font-medium">1 · Deploy agent</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Each deployment gets an agent ID, owner mobile, optional inbound allowlist, and later
                a dedicated Twilio business line.
              </p>

              <label className="mt-3 block text-xs font-medium text-muted-foreground">Workspace</label>
              <input
                type="text"
                value={workspaceNameInput}
                onChange={(e) => setWorkspaceNameInput(e.target.value)}
                placeholder="Acme Corp"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />

              <label className="mt-3 block text-xs font-medium text-muted-foreground">Agent name</label>
              <input
                type="text"
                value={agentNameInput}
                onChange={(e) => setAgentNameInput(e.target.value)}
                placeholder="Executive assistant"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />

              <label className="mt-3 block text-xs font-medium text-muted-foreground">Role</label>
              <select
                value={agentRoleInput}
                onChange={(e) => setAgentRoleInput(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="executive">Executive assistant</option>
                <option value="sales">Sales / SDR</option>
                <option value="support">Support</option>
                <option value="ops">Ops / on-call</option>
                <option value="custom">Custom</option>
              </select>

              <label className="mt-3 block text-xs font-medium text-muted-foreground">
                Owner mobile (E.164)
              </label>
              <input
                type="tel"
                value={userPhoneInput}
                onChange={(e) => setUserPhoneInput(e.target.value)}
                placeholder="+41761234567"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm"
              />

              <label className="mt-3 block text-xs font-medium text-muted-foreground">
                Owner email (optional)
              </label>
              <input
                type="email"
                value={ownerEmailInput}
                onChange={(e) => setOwnerEmailInput(e.target.value)}
                placeholder="you@company.com"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />

              <label className="mt-3 block text-xs font-medium text-muted-foreground">
                Inbound allowlist (comma-separated)
              </label>
              <textarea
                value={allowedCallersInput}
                onChange={(e) => setAllowedCallersInput(e.target.value)}
                placeholder="+41441234567, +14155551234"
                rows={2}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Dedicated line: only owner + allowlist can call/text in.
              </p>

              <Button
                size="sm"
                variant={agentLine ? "outline" : "default"}
                className="mt-3 w-full"
                disabled={creatingLine || !userPhoneInput.trim() || !agentNameInput.trim()}
                onClick={() => void handleCreateLine()}
              >
                {creatingLine ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : agentLine ? (
                  "Update deployment"
                ) : (
                  "Deploy agent"
                )}
              </Button>

              {agentLine && deployment && (
                <div className="mt-4 space-y-3 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">2 · Business line</p>
                  <div className="rounded-lg bg-muted/50 p-2 font-mono text-xs">
                    <p>agentId {deployment.agentId}</p>
                    <p>lineId {deployment.lineId}</p>
                  </div>

                  {agentLine.dedicatedPhoneNumber ? (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">Dedicated business line</p>
                        <p className="font-mono text-base">{agentLine.dedicatedPhoneNumber}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Provider: {agentLine.telephonyProvider ?? telephonyProvider}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Voice · SMS
                        {agentLine.telephonyProvider === "agentphone" ? " · WhatsApp/iMessage via AgentPhone" : " · WhatsApp Business"}{" "}
                        ({agentLine.whatsappStatus ?? "voice_sms_ready"})
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {agentPhoneConfigured
                          ? "Provisions a dedicated US line via AgentPhone (voice + SMS + messaging)."
                          : "Provisions a US Twilio number (~$1/mo) with allowlist enforcement."}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={provisioningNumber || !canProvisionLine}
                        onClick={() => void handleProvisionNumber()}
                      >
                        {provisioningNumber ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Provision business line"
                        )}
                      </Button>
                    </>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground">Shared pool fallback · PIN {agentLine.pin}</p>
                    {(sharedNumbers?.europe ?? twilio.europePhoneNumber) && (
                      <p className="font-mono text-xs">
                        EU {sharedNumbers?.europe ?? twilio.europePhoneNumber}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={callingMe || !canProvisionLine}
                    onClick={() => void handleCallMe()}
                  >
                    {callingMe ? <Loader2 className="size-4 animate-spin" /> : "Outbound: call owner"}
                  </Button>

                  {!canProvisionLine && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Run <code className="rounded bg-muted px-1">npm run tunnel</code> and set{" "}
                      <code className="rounded bg-muted px-1">PUBLIC_TUNNEL_URL</code> so{" "}
                      {agentPhoneConfigured ? "AgentPhone" : "Twilio"} webhooks can reach this app.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">3 · Enterprise data sources</p>
          </div>
          {loadingStatus ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {toolkits.map((toolkit) => {
                const badge = toolkitBadge(toolkit)
                return (
                <li key={toolkit.slug} className="rounded-2xl border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{toolkit.label}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", badge.className)}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{toolkit.description}</p>
                  {toolkit.connected && toolkit.working === false && toolkit.workError && (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                      {toolkit.workError.includes("Gmail API")
                        ? "OAuth worked, but the Gmail API is disabled in Google Cloud — enable it below."
                        : toolkit.workError}
                    </p>
                  )}
                  {toolkit.connectHint && !toolkit.configured && (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      {toolkit.connectHint}
                    </p>
                  )}
                  {!toolkit.connected && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full"
                      disabled={!toolkit.configured || connecting === toolkit.slug}
                      onClick={() => handleConnect(toolkit.slug)}
                    >
                      {connecting === toolkit.slug ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        `Connect ${toolkit.label}`
                      )}
                    </Button>
                  )}
                </li>
              )})}
            </ul>
          )}

          {gmailToolkit?.connected && gmailToolkit.working === false && (
            <details open className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-300">
                Gmail connected — enable Gmail API
              </summary>
              <p className="mt-2 text-muted-foreground">
                Google sign-in succeeded, but API calls fail until the Gmail API is turned on for your
                OAuth project.
              </p>
              <ol className="mt-2 list-decimal space-y-2 pl-4 text-muted-foreground">
                <li>
                  <a
                    href={`https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=${gcpProject}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Enable Gmail API
                  </a>{" "}
                  in project <code>{gcpProject}</code> → Enable → wait ~1 minute.
                </li>
                <li>Refresh this page, then ask about your inbox again.</li>
              </ol>
            </details>
          )}

          {!gmailToolkit?.connected && (
          <details open className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-300">
              Fix Google 403 access_denied
            </summary>
            <p className="mt-2 text-muted-foreground">
              Your redirect URI is correct. A 403 means Google&apos;s <strong>Testing mode</strong>{" "}
              is blocking the account — not Composio.
            </p>
            <p className="mt-2 font-medium text-amber-900 dark:text-amber-200">
              In project <code>{gcpProject}</code>:
            </p>
            <ol className="mt-1 list-decimal space-y-2 pl-4 text-muted-foreground">
              <li>
                <a
                  href={`https://console.cloud.google.com/auth/audience?project=${gcpProject}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Audience
                </a>{" "}
                → User type <strong>External</strong> → Publishing status{" "}
                <strong>Testing</strong> → Test users → add your Gmail → Save.
              </li>
              <li>
                Data access → add scopes: <code>gmail.readonly</code>,{" "}
                <code>calendar.readonly</code>, <code>drive.readonly</code>, email, profile.
              </li>
              <li>
                <a
                  href={`https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=${gcpProject}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Enable Gmail API
                </a>{" "}
                if not already on.
              </li>
              <li>
                Redirect URI (already added):{" "}
                <code className="break-all">{getGoogleOAuthRedirectUri()}</code>
              </li>
              <li>
                Sign out of Google, open an <strong>incognito</strong> window, Connect Gmail, pick{" "}
                your test-user account.
              </li>
            </ol>
          </details>
          )}
        </aside>

        <div className="flex min-h-[520px] flex-col rounded-3xl border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Phone className="size-5 text-primary" />
              <p className="font-semibold">Agent console (browser)</p>
            </div>
            <div className="flex rounded-full border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode("voice")}
                className={cn(
                  "rounded-full px-3 py-1",
                  mode === "voice" && "bg-primary text-primary-foreground",
                )}
              >
                Voice
              </button>
              <button
                type="button"
                onClick={() => setMode("text")}
                className={cn(
                  "rounded-full px-3 py-1",
                  mode === "text" && "bg-primary text-primary-foreground",
                )}
              >
                Text
              </button>
            </div>
          </div>

          {mode === "voice" && (
            <div className="flex flex-col items-center gap-4 border-b px-5 py-8">
              <Waveform analyser={waveformAnalyser} active={waveformActive} className="w-full max-w-md" />
              <Button
                size="icon-lg"
                className={cn(
                  "size-20 rounded-full shadow-lg",
                  isRecording && "scale-105 bg-destructive hover:bg-destructive/90",
                )}
                disabled={busy && !isRecording}
                onClick={() => void handleVoiceTurn()}
                aria-label={isRecording ? "End turn" : "Start speaking"}
              >
                {phase === "thinking" ? (
                  <Loader2 className="size-8 animate-spin" />
                ) : isRecording ? (
                  <Square className="size-7 fill-current" />
                ) : (
                  <Mic className="size-8" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {phase === "listening"
                  ? "Listening… tap to send"
                  : phase === "thinking"
                    ? "Thinking…"
                    : phase === "speaking"
                      ? "Agent speaking…"
                      : "Tap to talk"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {VOICE_STARTERS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSend(prompt)}
                    className="rounded-full border bg-background px-3 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5" id={listId}>
            {messages.length === 0 && mode === "text" && (
              <p className="text-sm text-muted-foreground">Type a message below, or switch to Voice.</p>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted/60",
                )}
              >
                {message.role === "user" && (
                  <p className="mb-1 text-xs opacity-70 uppercase">You</p>
                )}
                {message.role === "assistant" && (
                  <p className="mb-1 flex items-center gap-1 text-xs opacity-70 uppercase">
                    <Bot className="size-3" /> Agent
                  </p>
                )}
                {message.content}
              </div>
            ))}
          </div>

          {displayError && (
            <p className="px-5 pb-2 text-sm text-destructive">{displayError}</p>
          )}

          {mode === "text" && (
            <form
              className="flex gap-2 border-t p-4"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSend(input)
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type to the agent…"
                className="flex-1 rounded-xl border bg-background px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={busy}
              />
              <Button type="submit" disabled={busy || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
