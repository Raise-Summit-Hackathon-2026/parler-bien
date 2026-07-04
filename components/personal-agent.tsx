"use client"

import { ArrowLeft, Bot, Check, Copy, Link2, Loader2, Mic, Phone, Send, Square } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useId, useRef, useState } from "react"

import { Waveform } from "@/components/waveform"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useSpeaker } from "@/hooks/use-speaker"
import { useVoiceActivity } from "@/hooks/use-voice-activity"
import {
  createNewAgentUserId,
  getActiveAgentUserId,
  listSavedAgents,
  migrateLegacyActiveAgent,
  setActiveAgentUserId,
  upsertSavedAgent,
  type SavedPersonalAgent,
} from "@/lib/client-agent-registry"
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
  allowAllInbound?: boolean
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

type UsageSummary = {
  totalUsd: number
  sessionUsd: number
  formatted: {
    total: string
    session: string
    estimates: {
      browserVoiceTurn: string
      browserChatTurn: string
      phoneVoiceTurn: string
      phoneSms: string
    }
  }
}

const VOICE_STARTERS = [
  "What's urgent in my inbox?",
  "What does tomorrow look like?",
  "Summarize my latest emails.",
  "Any calendar conflicts this week?",
]

const PRIMARY_TOOLKIT_SLUGS = ["gmail", "googlecalendar"]

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

export function PersonalAgentPanel() {
  const [userId, setUserId] = useState("")
  const [savedAgents, setSavedAgents] = useState<SavedPersonalAgent[]>([])
  const [toolkits, setToolkits] = useState<ToolkitStatus[]>([])
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<"voice" | "text">("voice")
  const [liveMode, setLiveMode] = useState(true)
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
  const [allowAllInbound, setAllowAllInbound] = useState(true)
  const [userPhoneInput, setUserPhoneInput] = useState("")
  const [deployment, setDeployment] = useState<AgentDeployment | null>(null)
  const [creatingLine, setCreatingLine] = useState(false)
  const [provisioningNumber, setProvisioningNumber] = useState(false)
  const [callingMe, setCallingMe] = useState(false)
  const [callBackDelay, setCallBackDelay] = useState(0)
  const [callBackNotice, setCallBackNotice] = useState<string | null>(null)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [telephonyProvider, setTelephonyProvider] = useState<"agentphone" | "twilio">("twilio")
  const [agentPhoneConfigured, setAgentPhoneConfigured] = useState(false)
  const [canProvisionLine, setCanProvisionLine] = useState(false)
  const [googleCloudProject, setGoogleCloudProject] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const listId = useId()
  const sessionStartRef = useRef(new Date().toISOString())
  const liveModeRef = useRef(liveMode)
  const processingVoiceRef = useRef(false)
  const messagesRef = useRef(messages)
  liveModeRef.current = liveMode
  messagesRef.current = messages

  const { isRecording, analyser: recorderAnalyser, error: micError, startRecording, stopRecording } =
    useAudioRecorder()
  const { isSpeaking, analyser: speakerAnalyser, speak, stop: stopSpeaking } = useSpeaker()

  const resolveUserId = useCallback(() => userId, [userId])

  const refreshSavedAgents = useCallback(() => {
    setSavedAgents(listSavedAgents())
  }, [])

  const loadUsage = useCallback(async (uid: string) => {
    try {
      const params = new URLSearchParams({
        userId: uid,
        since: sessionStartRef.current,
      })
      const response = await fetch(`/api/agent/usage?${params}`)
      if (!response.ok) return
      const data = (await response.json()) as UsageSummary
      setUsage(data)
    } catch {
      setUsage(null)
    }
  }, [])

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
    refreshSavedAgents()
    const active = getActiveAgentUserId()
    if (active) {
      setUserId(active)
      void loadStatus(active)
      void loadUsage(active)
    } else {
      setLoadingStatus(false)
    }
  }, [loadStatus, loadUsage, refreshSavedAgents])

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
      if (data.line?.allowAllInbound !== undefined) {
        setAllowAllInbound(data.line.allowAllInbound !== false)
      }
      if (data.line?.userPhone) setUserPhoneInput(data.line.userPhone)
      if (data.line) {
        migrateLegacyActiveAgent(data.line.agentName, data.line.dedicatedPhoneNumber)
        upsertSavedAgent({
          userId: uid,
          agentName: data.line.agentName ?? "My agent",
          phoneNumber: data.line.dedicatedPhoneNumber,
          createdAt: data.line.createdAt,
        })
        refreshSavedAgents()
      }
    } catch {
      setAgentLine(null)
    }
  }, [refreshSavedAgents])

  const switchToAgent = useCallback(
    async (nextUserId: string) => {
      if (nextUserId === userId) return
      setActiveAgentUserId(nextUserId)
      setUserId(nextUserId)
      setAgentLine(null)
      setMessages([])
      setError(null)
      sessionStartRef.current = new Date().toISOString()
      await Promise.all([loadStatus(nextUserId), loadAgentLine(nextUserId), loadUsage(nextUserId)])
    },
    [userId, loadStatus, loadAgentLine, loadUsage],
  )

  function startNewAgent() {
    const id = createNewAgentUserId()
    setUserId(id)
    setAgentLine(null)
    setAgentChannels(null)
    setMessages([])
    setAgentNameInput("")
    setUserPhoneInput("")
    setError(null)
    sessionStartRef.current = new Date().toISOString()
    refreshSavedAgents()
  }

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

  async function submitVoiceTurn() {
    if (processingVoiceRef.current || phase === "thinking") return
    if (!isRecording) return

    processingVoiceRef.current = true
    setPhase("thinking")
    setError(null)
    const audio = await stopRecording()
    if (!audio) {
      processingVoiceRef.current = false
      setPhase("idle")
      if (liveModeRef.current) await startRecording()
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
          history: messagesRef.current,
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
      setMessages(
        data.messages ?? [
          ...messagesRef.current,
          { role: "user", content: data.transcript! },
          { role: "assistant", content: data.reply! },
        ],
      )
      setPhase("speaking")
      await speak(data.reply, "coach", {
        gender: "female",
        ageRange: "30-40",
        tone: "Calm, concise personal agent. Professional briefing voice.",
        accent: "American English",
        userId: resolveUserId(),
      })
      void loadUsage(resolveUserId())
      if (liveModeRef.current && mode === "voice") {
        setPhase("listening")
        await startRecording()
      } else {
        setPhase("idle")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice call failed")
      if (liveModeRef.current && mode === "voice") {
        setPhase("listening")
        await startRecording()
      } else {
        setPhase("idle")
      }
    } finally {
      processingVoiceRef.current = false
    }
  }

  useVoiceActivity({
    analyser: recorderAnalyser,
    enabled: liveMode && isRecording && phase === "listening",
    onUtteranceEnd: () => void submitVoiceTurn(),
  })

  async function stopLiveConversation() {
    setLiveMode(false)
    stopSpeaking()
    if (isRecording) await stopRecording()
    setPhase("idle")
  }

  async function startLiveConversation() {
    setLiveMode(true)
    setError(null)
    stopSpeaking()
    if (!isRecording) {
      setPhase("listening")
      await startRecording()
    }
  }

  async function handleVoiceTurn() {
    if (liveMode) {
      if (isRecording || isSpeaking || phase === "thinking") {
        await stopLiveConversation()
      } else {
        await startLiveConversation()
      }
      return
    }

    if (phase === "thinking") return

    if (isRecording) {
      await submitVoiceTurn()
      return
    }

    stopSpeaking()
    setError(null)
    setPhase("listening")
    await startRecording()
  }

  useEffect(() => {
    if (mode !== "voice" && liveMode) {
      void stopLiveConversation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mode switch only
  }, [mode])

  async function handleCreateLine() {
    const phone = userPhoneInput.trim()
    const agentName = agentNameInput.trim()
    if (!phone || !agentName) return

    setCreatingLine(true)
    setError(null)
    let uid = userId
    if (!uid) {
      uid = createNewAgentUserId()
      setUserId(uid)
    }
    try {
      const response = await fetch("/api/agent/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uid,
          userPhone: phone,
          agentName,
          workspaceName: workspaceNameInput.trim() || undefined,
          ownerEmail: ownerEmailInput.trim() || undefined,
          agentRole: agentRoleInput,
          allowedCallerPhones: allowAllInbound ? "all" : allowedCallersInput,
          allowAllInbound,
        }),
      })
      const data = (await response.json()) as AgentLineResponse
      if (!response.ok) throw new Error(data.error ?? "Failed to create personal agent")
      if (data.line && !data.line.dedicatedPhoneNumber) {
        setProvisioningNumber(true)
        try {
          const prov = await fetch("/api/agent/line/provision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid }),
          })
          const provData = (await prov.json()) as AgentLineResponse & { ok?: boolean; error?: string }
          if (!prov.ok || !provData.ok) {
            throw new Error(provData.error ?? "Could not assign your phone number")
          }
        } finally {
          setProvisioningNumber(false)
        }
      }
      await loadAgentLine(uid)
      upsertSavedAgent({
        userId: uid,
        agentName,
        createdAt: new Date().toISOString(),
      })
      refreshSavedAgents()
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
    setCallBackNotice(null)
    try {
      const response = await fetch("/api/agent/line/call-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resolveUserId(),
          delaySeconds: callBackDelay,
        }),
      })
      const data = (await response.json()) as {
        ok?: boolean
        error?: string
        message?: string
        welcomePreview?: string
        scheduled?: boolean
      }
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Call failed")
      setCallBackNotice(data.message ?? "Calling you back…")
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
      void loadUsage(resolveUserId())
      if (mode === "voice") {
        setPhase("speaking")
        await speak(data.reply, "coach", {
          gender: "female",
          ageRange: "30-40",
          tone: "Calm, concise personal agent.",
          accent: "American English",
          userId: resolveUserId(),
        })
      }
      setPhase("idle")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed")
      setPhase("idle")
    }
  }

  async function handleCopyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(true)
      window.setTimeout(() => setCopiedPhone(false), 2000)
    } catch {
      setError("Could not copy number")
    }
  }

  const gcpProject = googleCloudProject ?? "780417362460"
  const gmailToolkit = toolkits.find((t) => t.slug === "gmail")
  const primaryToolkits = toolkits.filter((t) => PRIMARY_TOOLKIT_SLUGS.includes(t.slug))
  const moreToolkits = toolkits.filter((t) => !PRIMARY_TOOLKIT_SLUGS.includes(t.slug))
  const agentNumber = agentLine?.dedicatedPhoneNumber ?? agentChannels?.voice
  const gmailConnected = gmailToolkit?.connected && gmailToolkit.working !== false
  const settingUp = creatingLine || provisioningNumber
  const displayError = error ?? micError
  const waveformAnalyser = isRecording ? recorderAnalyser : speakerAnalyser
  const waveformActive = isRecording || isSpeaking
  const busy = phase === "thinking" || isSpeaking

  function renderToolkitCard(toolkit: ToolkitStatus) {
    const synced = toolkit.connected && toolkit.working !== false
    const needsSetup = toolkit.connected && toolkit.working === false

    return (
      <li key={toolkit.slug} className="rounded-2xl border bg-background p-3 text-sm">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
              synced && "bg-emerald-500/15 text-emerald-600",
              needsSetup && "bg-amber-500/15 text-amber-700",
              !toolkit.connected && "bg-muted text-muted-foreground",
            )}
          >
            {synced ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current opacity-50" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{toolkit.label}</p>
            {synced && <p className="text-xs text-emerald-700 dark:text-emerald-400">Synced to your agent</p>}
            {needsSetup && (
              <p className="text-xs text-amber-800 dark:text-amber-300">Connected — finish setup in Google Cloud</p>
            )}
            {!toolkit.connected && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
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
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Home
      </Link>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Personal agent
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your situationally aware agent</h1>
        <p className="max-w-2xl text-muted-foreground">
          A phone number that knows your life — connect your inbox and calendar, then call, text, or talk here.
        </p>
      </div>

      {usage && (
        <section className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">Usage cost</p>
            <p className="text-xs text-muted-foreground">Estimates · actual varies with tools & length</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <p>
              <span className="text-muted-foreground">This session </span>
              <span className="font-mono font-medium">{usage.formatted.session}</span>
            </p>
            <p>
              <span className="text-muted-foreground">All time </span>
              <span className="font-mono font-medium">{usage.formatted.total}</span>
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            ~{usage.formatted.estimates.browserVoiceTurn} live voice turn · ~
            {usage.formatted.estimates.browserChatTurn} text · ~
            {usage.formatted.estimates.phoneVoiceTurn} phone · ~
            {usage.formatted.estimates.phoneSms} SMS
          </p>
        </section>
      )}

      {agentNumber && (
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Your agent&apos;s number</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {formatPhoneDisplay(agentNumber)}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCopyPhone(agentNumber)}
            >
              {copiedPhone ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiedPhone ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Call or text this number anytime — same agent as here in the browser.
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={callingMe || !agentLine}
                onClick={() => void handleCallMe()}
              >
                {callingMe ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {callBackDelay > 0 ? "Scheduling…" : "Preparing call…"}
                  </>
                ) : callBackDelay > 0 ? (
                  `Schedule callback (${callBackDelay}s)`
                ) : (
                  "Call me back now"
                )}
              </Button>
              {gmailConnected && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs whitespace-nowrap text-emerald-700 dark:text-emerald-400">
                  <Check className="size-3" />
                  Life data connected
                </span>
              )}
            </div>
            <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Callback in</span>
              <select
                value={callBackDelay}
                onChange={(event) => setCallBackDelay(Number(event.target.value))}
                className="rounded-md border bg-background px-2 py-1 text-foreground"
              >
                <option value={0}>Now</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
              </select>
              <span>— opening line is generated from your connected data, not a script.</span>
            </label>
            {callBackNotice && (
              <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
                {callBackNotice}
              </p>
            )}
          </div>
        </section>
      )}

      {settingUp && (
        <div className="flex items-center gap-2 rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Setting up your agent and phone number…
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,320px)_1fr]">
        <aside className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
          {savedAgents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Your agents</p>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={startNewAgent}>
                  + New
                </Button>
              </div>
              <ul className="space-y-1">
                {savedAgents.map((agent) => {
                  const active = agent.userId === userId
                  return (
                    <li key={agent.userId}>
                      <button
                        type="button"
                        onClick={() => void switchToAgent(agent.userId)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5"
                            : "bg-background hover:bg-muted/50",
                        )}
                      >
                        <p className="font-medium">{agent.agentName}</p>
                        {agent.phoneNumber ? (
                          <p className="font-mono text-xs text-muted-foreground">
                            {formatPhoneDisplay(agent.phoneNumber)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Setting up…</p>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {!agentLine ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                <p className="font-medium">Get started</p>
              </div>
              <p className="text-xs text-muted-foreground">
                We&apos;ll create your agent and assign a phone number.
              </p>
              <label className="block text-xs font-medium text-muted-foreground">Your name</label>
              <input
                type="text"
                value={agentNameInput}
                onChange={(e) => setAgentNameInput(e.target.value)}
                placeholder="Ivan"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <label className="block text-xs font-medium text-muted-foreground">Your mobile</label>
              <input
                type="tel"
                value={userPhoneInput}
                onChange={(e) => setUserPhoneInput(e.target.value)}
                placeholder="+41761234567"
                className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                So your agent can call you when you tap &ldquo;Call me&rdquo;.
              </p>
              <Button
                className="w-full"
                disabled={settingUp || !userPhoneInput.trim() || !agentNameInput.trim()}
                onClick={() => void handleCreateLine()}
              >
                {settingUp ? <Loader2 className="size-4 animate-spin" /> : "Create my agent"}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Connect your life</p>
              </div>
              {loadingStatus ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <>
                  <ul className="space-y-3">{primaryToolkits.map(renderToolkitCard)}</ul>
                  {moreToolkits.length > 0 && (
                    <details className="rounded-2xl border bg-background p-3 text-sm">
                      <summary className="cursor-pointer font-medium">More connections</summary>
                      <ul className="mt-3 space-y-3">{moreToolkits.map(renderToolkitCard)}</ul>
                    </details>
                  )}
                </>
              )}
              {gmailToolkit?.connected && gmailToolkit.working === false && (
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Gmail sign-in worked —{" "}
                  <a
                    href={`https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=${gcpProject}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    enable Gmail API
                  </a>{" "}
                  in Google Cloud, then refresh.
                </p>
              )}
              <details className="rounded-2xl border bg-background p-3 text-xs">
                <summary className="cursor-pointer font-medium">Edit profile</summary>
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={agentNameInput}
                    onChange={(e) => setAgentNameInput(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="tel"
                    value={userPhoneInput}
                    onChange={(e) => setUserPhoneInput(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={settingUp}
                    onClick={() => void handleCreateLine()}
                  >
                    Save
                  </Button>
                </div>
              </details>
            </>
          )}
        </aside>

        <div className="flex min-h-[520px] flex-col rounded-3xl border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Phone className="size-5 text-primary" />
              <p className="font-semibold">Talk to your agent</p>
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
              <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    liveMode && (phase === "listening" || isRecording)
                      ? "animate-pulse bg-emerald-500"
                      : liveMode
                        ? "bg-amber-500"
                        : "bg-muted-foreground/40",
                  )}
                />
                {liveMode ? "Live conversation" : "Manual turns"}
              </div>
              <Waveform analyser={waveformAnalyser} active={waveformActive} className="w-full max-w-md" />
              <Button
                size="icon-lg"
                className={cn(
                  "size-20 rounded-full shadow-lg",
                  liveMode && (isRecording || phase === "listening") &&
                    "ring-4 ring-emerald-500/30 ring-offset-2 ring-offset-background",
                  isRecording && !liveMode && "scale-105 bg-destructive hover:bg-destructive/90",
                  liveMode && (isRecording || phase === "listening") && "bg-emerald-600 hover:bg-emerald-600/90",
                )}
                disabled={phase === "thinking"}
                onClick={() => void handleVoiceTurn()}
                aria-label={liveMode ? "End live conversation" : isRecording ? "Send message" : "Start speaking"}
              >
                {phase === "thinking" ? (
                  <Loader2 className="size-8 animate-spin" />
                ) : liveMode && (isRecording || phase === "listening" || phase === "speaking") ? (
                  <Square className="size-7 fill-current" />
                ) : isRecording ? (
                  <Square className="size-7 fill-current" />
                ) : (
                  <Mic className="size-8" />
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {liveMode
                  ? phase === "listening" || isRecording
                    ? "Live · speak naturally — pauses send automatically"
                    : phase === "thinking"
                      ? "Thinking…"
                      : phase === "speaking"
                        ? "Agent speaking…"
                        : "Tap the mic to start live conversation"
                  : phase === "listening"
                    ? "Listening… tap to send"
                    : phase === "thinking"
                      ? "Thinking…"
                      : phase === "speaking"
                        ? "Agent speaking…"
                        : "Tap to talk"}
              </p>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => void (liveMode ? stopLiveConversation() : startLiveConversation())}
              >
                {liveMode ? "Switch to manual turns" : "Switch to live conversation"}
              </button>
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
