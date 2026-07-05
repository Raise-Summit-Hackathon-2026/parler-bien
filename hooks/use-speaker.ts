"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { authenticatedFetch } from "@/lib/supabase"
import type { TtsRequestOptions, TtsStyle } from "@/lib/tts"

type ActivePlayback = {
  id: number
  stop: () => void
}

export type AvatarAudioSink = {
  isReady: boolean
  speakText: (text: string) => Promise<boolean>
}

type UseSpeakerOptions = {
  avatarSink?: AvatarAudioSink | null
}

let playbackVersion = 0
let activePlayback: ActivePlayback | null = null

function shouldRouteToAvatar(style: TtsStyle, avatarSink?: AvatarAudioSink | null) {
  return Boolean(avatarSink?.isReady && (style === "character" || style === "coach"))
}

export function useSpeaker(options?: UseSpeakerOptions) {
  const avatarSink = options?.avatarSink
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const playbackIdRef = useRef<number | null>(null)

  const cleanupPlayback = useCallback(() => {
    const playbackId = playbackIdRef.current
    if (playbackId !== null && activePlayback?.id === playbackId) {
      activePlayback = null
    }

    try {
      sourceRef.current?.stop()
    } catch {
      // already stopped
    }

    sourceRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
    playbackIdRef.current = null
    setAnalyser(null)
    setIsSpeaking(false)
  }, [])

  const stop = useCallback(() => {
    playbackVersion += 1
    activePlayback?.stop()
    cleanupPlayback()
  }, [cleanupPlayback])

  useEffect(() => stop, [stop])

  const speak = useCallback(
    async (text: string, style: TtsStyle, ttsOptions?: TtsRequestOptions) => {
      if (!text.trim()) return

      const playbackId = playbackVersion + 1
      playbackVersion = playbackId

      activePlayback?.stop()
      cleanupPlayback()

      const routeToAvatar = shouldRouteToAvatar(style, avatarSink)

      if (routeToAvatar && avatarSink) {
        setIsSpeaking(true)
        playbackIdRef.current = playbackId
        activePlayback = {
          id: playbackId,
          stop: () => {
            setIsSpeaking(false)
          },
        }

        const spoke = await avatarSink.speakText(text.trim())
        if (playbackVersion === playbackId) {
          setIsSpeaking(false)
          if (activePlayback?.id === playbackId) {
            activePlayback = null
          }
        }

        if (spoke) return
      }

      // Mark as speaking from the moment the line is requested, so callers
      // can't start recording during the fetch/decode gap before audio plays.
      setIsSpeaking(true)

      try {
        const response = await authenticatedFetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            style,
            gender: ttsOptions?.gender,
            voice: ttsOptions?.voice,
            ageRange: ttsOptions?.ageRange,
            tone: ttsOptions?.tone,
            accent: ttsOptions?.accent,
            deliveryStyle: ttsOptions?.deliveryStyle,
            format: "wav",
          }),
        })

        if (!response.ok) {
          if (playbackVersion === playbackId) setIsSpeaking(false)
          return
        }

        const arrayBuffer = await response.arrayBuffer()
        if (playbackVersion !== playbackId) return

        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        const analyserNode = audioContext.createAnalyser()
        analyserNode.fftSize = 256

        const audioBuffer = await audioContext.decodeAudioData(
          arrayBuffer.slice(0)
        )
        if (playbackVersion !== playbackId) {
          void audioContext.close()
          if (audioContextRef.current === audioContext) {
            audioContextRef.current = null
          }
          return
        }

        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(analyserNode)
        analyserNode.connect(audioContext.destination)

        playbackIdRef.current = playbackId
        activePlayback = { id: playbackId, stop: cleanupPlayback }
        sourceRef.current = source
        setAnalyser(analyserNode)
        setIsSpeaking(true)

        source.onended = () => {
          if (playbackIdRef.current === playbackId) {
            cleanupPlayback()
          }
        }
        source.start(0)
      } catch {
        if (playbackVersion === playbackId) {
          cleanupPlayback()
        }
      }
    },
    [avatarSink, cleanupPlayback]
  )

  return { isSpeaking, analyser, speak, stop }
}
