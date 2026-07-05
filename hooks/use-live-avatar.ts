"use client"

import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  SessionState,
} from "@heygen/liveavatar-web-sdk"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { LanguageId } from "@/lib/languages"
import { LIVE_AVATAR_MAX_SESSION_SECONDS } from "@/lib/liveavatar"
import { authenticatedFetch } from "@/lib/supabase"

export type LiveAvatarStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "speaking"
  | "expired"
  | "error"

type UseLiveAvatarOptions = {
  avatarId?: string
  languageId: LanguageId
  enabled?: boolean
  restartKey?: number
}

type ActiveSession = {
  id: number
  session: LiveAvatarSession
  stop: () => Promise<void>
}

let activeSession: ActiveSession | null = null
let sessionCounter = 0

async function stopActiveSession() {
  if (!activeSession) return
  const current = activeSession
  activeSession = null
  try {
    await current.stop()
  } catch {
    // ignore cleanup errors
  }
}

export function useLiveAvatar({
  avatarId,
  languageId,
  enabled = true,
  restartKey = 0,
}: UseLiveAvatarOptions) {
  const [status, setStatus] = useState<LiveAvatarStatus>("idle")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)

  const sessionRef = useRef<LiveAvatarSession | null>(null)
  const sessionIdRef = useRef<number | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const streamReadyRef = useRef(false)
  const speakResolveRef = useRef<(() => void) | null>(null)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxSessionSecondsRef = useRef(LIVE_AVATAR_MAX_SESSION_SECONDS)
  const [autoRestartKey, setAutoRestartKey] = useState(0)

  const clearSessionTimers = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }, [])

  const cleanupSession = useCallback(async () => {
    clearSessionTimers()
    const localId = sessionIdRef.current
    if (localId !== null && activeSession?.id === localId) {
      await stopActiveSession()
    }

    sessionRef.current = null
    sessionIdRef.current = null
    streamReadyRef.current = false
    speakResolveRef.current?.()
    speakResolveRef.current = null
    setIsSpeaking(false)
    setRemainingSeconds(null)
  }, [clearSessionTimers])

  const stop = useCallback(async () => {
    await cleanupSession()
    setStatus("idle")
  }, [cleanupSession])

  const expireSession = useCallback(async () => {
    await cleanupSession()

    if (enabled) {
      setStatus("connecting")
      setAutoRestartKey((key) => key + 1)
      return
    }

    setRemainingSeconds(0)
    setStatus("expired")
  }, [cleanupSession, enabled])

  const startSessionTimer = useCallback(() => {
    clearSessionTimers()
    setRemainingSeconds(null)

    keepAliveRef.current = setInterval(() => {
      void sessionRef.current?.keepAlive().catch(() => {})
    }, 45_000)
  }, [clearSessionTimers])

  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    videoElementRef.current = element
    if (element && streamReadyRef.current && sessionRef.current) {
      element.autoplay = true
      element.playsInline = true
      element.muted = false
      sessionRef.current.attach(element)
      void element.play().catch(() => {})
    }
  }, [])

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt()
    speakResolveRef.current?.()
    speakResolveRef.current = null
    setIsSpeaking(false)
  }, [])

  const speakText = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim()
      if (!trimmed || status !== "ready" || !sessionRef.current) {
        return false
      }

      sessionRef.current.interrupt()

      return new Promise<boolean>((resolve) => {
        const session = sessionRef.current
        if (!session) {
          resolve(false)
          return
        }

        const onSpeakStarted = () => {
          setIsSpeaking(true)
        }

        const onSpeakEnded = () => {
          session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onSpeakStarted)
          session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onSpeakEnded)
          speakResolveRef.current = null
          setIsSpeaking(false)
          resolve(true)
        }

        speakResolveRef.current = () => {
          session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onSpeakStarted)
          session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onSpeakEnded)
          setIsSpeaking(false)
          resolve(true)
        }

        session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, onSpeakStarted)
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, onSpeakEnded)

        try {
          session.repeat(trimmed)
        } catch {
          session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onSpeakStarted)
          session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onSpeakEnded)
          speakResolveRef.current = null
          setIsSpeaking(false)
          resolve(false)
        }
      })
    },
    [status],
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    const localSessionId = ++sessionCounter
    sessionIdRef.current = localSessionId

    async function connect() {
      setStatus("connecting")
      setError(null)
      streamReadyRef.current = false

      try {
        await stopActiveSession()

        const response = await authenticatedFetch("/api/avatar/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatarId,
            language: languageId,
          }),
        })

        if (!response.ok) {
          const data = (await response.json()) as { error?: string }
          throw new Error(data.error ?? "Avatar session failed")
        }

        if (cancelled || sessionIdRef.current !== localSessionId) return

        const data = (await response.json()) as {
          sessionToken: string
          avatarId?: string
          maxSessionDuration?: number
        }

        if (
          typeof data.maxSessionDuration === "number" &&
          data.maxSessionDuration > 0
        ) {
          maxSessionSecondsRef.current = data.maxSessionDuration
        }

        const session = new LiveAvatarSession(data.sessionToken, {
          voiceChat: false,
        })

        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          if (cancelled || sessionIdRef.current !== localSessionId) return
          streamReadyRef.current = true
          const video = videoElementRef.current
          if (video) {
            video.autoplay = true
            video.playsInline = true
            session.attach(video)
            void video.play().catch(() => {})
          }
        })

        session.on(AgentEventsEnum.SESSION_STOPPED, (event) => {
          if (cancelled) return
          const reason = event.stop_reason

          if (reason === "MAX_DURATION_REACHED") {
            void expireSession()
            return
          }

          void cleanupSession()

          if (reason === "NO_CREDITS") {
            setError("LiveAvatar credits exhausted")
          }

          setStatus("error")
        })

        session.on(SessionEvent.SESSION_DISCONNECTED, () => {
          if (cancelled || sessionIdRef.current !== localSessionId) return
          void cleanupSession()
          setStatus("error")
        })

        await session.start()

        if (cancelled || sessionIdRef.current !== localSessionId) {
          await session.stop()
          return
        }

        sessionRef.current = session
        activeSession = {
          id: localSessionId,
          session,
          stop: async () => {
            await session.stop()
          },
        }

        const markReady = () => {
          if (cancelled || sessionIdRef.current !== localSessionId) return
          setStatus("ready")
          startSessionTimer()
        }

        if (session.state === SessionState.CONNECTED) {
          markReady()
        } else {
          setStatus("connecting")
          session.once(SessionEvent.SESSION_STATE_CHANGED, (state) => {
            if (state === SessionState.CONNECTED) {
              markReady()
            }
          })
        }
      } catch (err) {
        if (cancelled || sessionIdRef.current !== localSessionId) return
        setStatus("error")
        setError(err instanceof Error ? err.message : "Avatar connection failed")
      }
    }

    void connect()

    return () => {
      cancelled = true
      void stop()
    }
  }, [
    enabled,
    avatarId,
    languageId,
    restartKey,
    autoRestartKey,
    stop,
    startSessionTimer,
    expireSession,
    cleanupSession,
  ])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        void stop()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [stop])

  return useMemo(
    () => ({
      status,
      isReady: status === "ready",
      isExpired: status === "expired",
      isSpeaking,
      remainingSeconds,
      error,
      attachVideo,
      speakText,
      interrupt,
      stop,
    }),
    [
      status,
      isSpeaking,
      remainingSeconds,
      error,
      attachVideo,
      speakText,
      interrupt,
      stop,
    ],
  )
}
