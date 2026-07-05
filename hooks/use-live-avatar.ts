"use client"

import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  SessionState,
} from "@heygen/liveavatar-web-sdk"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { LanguageId } from "@/lib/languages"
import { LIVE_AVATAR_IDLE_PAUSE_SECONDS, isLiveAvatarSandbox } from "@/lib/liveavatar"
import { authenticatedFetch } from "@/lib/supabase"

export type LiveAvatarStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "speaking"
  /** Session released after idle time or a provider cap — wakes on the next turn. */
  | "paused"
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

  const sessionRef = useRef<LiveAvatarSession | null>(null)
  const sessionIdRef = useRef<number | null>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const streamReadyRef = useRef(false)
  // Resolves the pending speakText promise. `spoke: false` tells useSpeaker
  // the avatar did NOT deliver the line, so it falls back to TTS.
  const speakResolveRef = useRef<((spoke: boolean) => void) | null>(null)
  const idleWatchRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivityRef = useRef(0)
  const speakingRef = useRef(false)

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const clearSessionTimers = useCallback(() => {
    if (idleWatchRef.current) {
      clearInterval(idleWatchRef.current)
      idleWatchRef.current = null
    }
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }, [])

  /**
   * @param fallbackToTts true when the session died unexpectedly (expiry,
   * disconnect, credits) — resolves the pending speak with `spoke: false`
   * so useSpeaker re-delivers the line via TTS instead of cutting it off.
   * Deliberate stops (toggle off, unmount, tab hidden) stay silent.
   */
  const cleanupSession = useCallback(
    async (fallbackToTts = false) => {
      clearSessionTimers()
      const localId = sessionIdRef.current
      if (localId !== null && activeSession?.id === localId) {
        await stopActiveSession()
      }

      sessionRef.current = null
      sessionIdRef.current = null
      streamReadyRef.current = false
      speakResolveRef.current?.(!fallbackToTts)
      speakResolveRef.current = null
      speakingRef.current = false
      setIsSpeaking(false)
    },
    [clearSessionTimers],
  )

  const stop = useCallback(async () => {
    await cleanupSession()
    setStatus("idle")
  }, [cleanupSession])

  /**
   * Release the session without giving up on the avatar: status "paused"
   * signals consumers to wake it (restartKey bump) on the next turn.
   * Pass fallbackToTts when a line may be mid-flight (provider cap hit).
   */
  const pauseSession = useCallback(
    async (fallbackToTts = false) => {
      await cleanupSession(fallbackToTts)
      setStatus("paused")
    },
    [cleanupSession],
  )

  const startSessionTimers = useCallback(() => {
    clearSessionTimers()
    markActivity()

    // Idle watch: release the session (credits) when nobody is talking.
    idleWatchRef.current = setInterval(() => {
      if (speakingRef.current) return
      const idleMs = Date.now() - lastActivityRef.current
      if (idleMs >= LIVE_AVATAR_IDLE_PAUSE_SECONDS * 1000) {
        void pauseSession()
      }
    }, 5_000)

    if (!isLiveAvatarSandbox()) {
      keepAliveRef.current = setInterval(() => {
        void sessionRef.current?.keepAlive().catch(() => {})
      }, 45_000)
    }
  }, [clearSessionTimers, markActivity, pauseSession])

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
    // Deliberate interrupt: resolve as spoken so the line is not re-read.
    speakResolveRef.current?.(true)
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
      markActivity()

      return new Promise<boolean>((resolve) => {
        const session = sessionRef.current
        if (!session) {
          resolve(false)
          return
        }

        const onSpeakStarted = () => {
          speakingRef.current = true
          markActivity()
          setIsSpeaking(true)
        }

        const onSpeakEnded = () => {
          session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onSpeakStarted)
          session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onSpeakEnded)
          speakResolveRef.current = null
          speakingRef.current = false
          markActivity()
          setIsSpeaking(false)
          resolve(true)
        }

        speakResolveRef.current = (spoke: boolean) => {
          session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onSpeakStarted)
          session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onSpeakEnded)
          speakingRef.current = false
          markActivity()
          setIsSpeaking(false)
          resolve(spoke)
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
            // Provider safety cap hit — pause and re-deliver any mid-flight
            // line via TTS; the session wakes on the next turn.
            void pauseSession(true)
            return
          }

          void cleanupSession(true)

          if (reason === "NO_CREDITS") {
            setError("LiveAvatar credits exhausted")
          }

          setStatus("error")
        })

        session.on(SessionEvent.SESSION_DISCONNECTED, () => {
          if (cancelled || sessionIdRef.current !== localSessionId) return
          void cleanupSession(true)
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
          startSessionTimers()
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
    stop,
    startSessionTimers,
    pauseSession,
    cleanupSession,
  ])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden" && sessionRef.current) {
        // Pause (not stop) so the session wakes again on the next turn.
        void pauseSession()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [pauseSession])

  return useMemo(
    () => ({
      status,
      isReady: status === "ready",
      isPaused: status === "paused",
      isSpeaking,
      error,
      attachVideo,
      speakText,
      interrupt,
      stop,
    }),
    [status, isSpeaking, error, attachVideo, speakText, interrupt, stop],
  )
}
