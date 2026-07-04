"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { TtsRequestOptions, TtsStyle } from "@/lib/tts"

type ActivePlayback = {
  id: number
  stop: () => void
}

let playbackVersion = 0
let activePlayback: ActivePlayback | null = null

export function useSpeaker() {
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
    async (text: string, style: TtsStyle, options?: TtsRequestOptions) => {
      if (!text.trim()) return

      const playbackId = playbackVersion + 1
      playbackVersion = playbackId

      activePlayback?.stop()
      cleanupPlayback()

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            style,
            gender: options?.gender,
            voice: options?.voice,
            ageRange: options?.ageRange,
            tone: options?.tone,
            accent: options?.accent,
            deliveryStyle: options?.deliveryStyle,
          }),
        })

        if (!response.ok) return

        const arrayBuffer = await response.arrayBuffer()
        if (playbackVersion !== playbackId) return

        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        const analyserNode = audioContext.createAnalyser()
        analyserNode.fftSize = 256

        const audioBuffer = await audioContext.decodeAudioData(
          arrayBuffer.slice(0),
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
    [cleanupPlayback],
  )

  return { isSpeaking, analyser, speak, stop }
}
