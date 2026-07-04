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

const VOICE_STARTERS = [
  "Brief me on Parler Bien for a judge.",
  "What's in my inbox today?",
  "Am I free tomorrow afternoon?",
  "Find my latest pitch deck on Drive.",
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
  const [configuringTwilio, setConfiguringTwilio] = useState(false)
  const listId = useId()

  const { isRecording, analyser: recorderAnalyser, error: micError, startRecording, stopRecording } =
    useAudioRecorder()
  const { isSpeaking, analyser: speakerAnalyser, speak, stop: stopSpeaking } = useSpeaker()

  const loadStatus = useCallback(async (uid: string) => {
    setLoadingStatus(true)
    setError(null)
    try {
      const response = await fetch(`/api/agent/status?userId=${encodeURIComponent(uid)}`)
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to load connections")
      }
      const data = (await response.json()) as { toolkits: ToolkitStatus[] }
      setToolkits(data.toolkits)
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

  useEffect(() => {
    void fetch("/api/twilio/status")
      .then((r) => r.json())
      .then((data: TwilioStatus) => setTwilio(data))
      .catch(() => setTwilio(null))
  }, [])

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
        body: JSON.stringify({ toolkit: slug, userId }),
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
            userId,
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
        body: JSON.stringify({ userId, messages: nextMessages }),
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
          Personal agents
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Call the agent</h1>
        <p className="max-w-2xl text-muted-foreground">
          Talk in your browser or call the Twilio line — voice in, voice out. Connect Gmail for live
          inbox context via Composio.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="max-h-[70vh] space-y-4 overflow-y-auto rounded-3xl border bg-card p-5 shadow-sm lg:max-h-none">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Connected apps</p>
          </div>
          {loadingStatus ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {toolkits.map((toolkit) => (
                <li key={toolkit.slug} className="rounded-2xl border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{toolkit.label}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        toolkit.connected
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {toolkit.connected ? "Connected" : "Not linked"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{toolkit.description}</p>
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
              ))}
            </ul>
          )}

          {twilio?.configured && twilio.phoneNumber && (
            <div className="rounded-2xl border bg-background p-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-primary" />
                <p className="font-medium">Phone line</p>
              </div>
              <p className="mt-2 font-mono text-base">{twilio.phoneNumber}</p>
              {twilio.europePhoneNumber && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Europe (CH): <span className="font-mono">{twilio.europePhoneNumber}</span>
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {twilio.reachable
                  ? twilio.tunnelUrl
                    ? `Live via tunnel: ${twilio.tunnelUrl} — call now.`
                    : "Phone line live on production URL."
                  : "Run npm run tunnel in a second terminal, set PUBLIC_TUNNEL_URL in .env.local, restart dev."}
              </p>
              {twilio.canConfigureWebhooks && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  disabled={configuringTwilio}
                  onClick={() => {
                    setConfiguringTwilio(true)
                    void fetch("/api/twilio/status", { method: "POST" })
                      .then((r) => r.json())
                      .then((data: { ok?: boolean; error?: string }) => {
                        if (!data.ok) throw new Error(data.error ?? "Failed")
                      })
                      .catch((err) =>
                        setError(err instanceof Error ? err.message : "Twilio configure failed"),
                      )
                      .finally(() => setConfiguringTwilio(false))
                  }}
                >
                  {configuringTwilio ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Point Twilio to this app"
                  )}
                </Button>
              )}
            </div>
          )}

          {!toolkits.some((t) => t.slug === "gmail" && t.connected) && (
          <details open className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-300">
              Fix Google 403 access_denied
            </summary>
            <p className="mt-2 text-muted-foreground">
              Your redirect URI is correct. A 403 means Google&apos;s <strong>Testing mode</strong>{" "}
              is blocking the account — not Composio.
            </p>
            <p className="mt-2 font-medium text-amber-900 dark:text-amber-200">
              In project <code>gen-lang-client-0597351768</code>:
            </p>
            <ol className="mt-1 list-decimal space-y-2 pl-4 text-muted-foreground">
              <li>
                <a
                  href="https://console.cloud.google.com/auth/audience?project=gen-lang-client-0597351768"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Audience
                </a>{" "}
                → User type <strong>External</strong> → Publishing status{" "}
                <strong>Testing</strong> → Test users → add exactly{" "}
                <code>ivan.glushenkov.data@gmail.com</code> → Save.
              </li>
              <li>
                Data access → add scopes: <code>gmail.readonly</code>,{" "}
                <code>calendar.readonly</code>, <code>drive.readonly</code>, email, profile.
              </li>
              <li>
                <a
                  href="https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=gen-lang-client-0597351768"
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
                <strong>only</strong> the test-user account above.
              </li>
            </ol>
          </details>
          )}
        </aside>

        <div className="flex min-h-[520px] flex-col rounded-3xl border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Phone className="size-5 text-primary" />
              <p className="font-semibold">Live voice call</p>
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
