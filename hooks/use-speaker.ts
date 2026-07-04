"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { TtsRequestOptions, TtsStyle } from "@/lib/tts"

export function useSpeaker() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  const stop = useCallback(() => {
    try {
      sourceRef.current?.stop()
    } catch {
      // already stopped
    }
    sourceRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
    setAnalyser(null)
    setIsSpeaking(false)
  }, [])

  useEffect(() => stop, [stop])

  const speak = useCallback(
    async (text: string, style: TtsStyle, options?: TtsRequestOptions) => {
      if (!text.trim()) return

      stop()

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            style,
            gender: options?.gender,
            ageRange: options?.ageRange,
          }),
        })

        if (!response.ok) return

        const arrayBuffer = await response.arrayBuffer()
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        const analyserNode = audioContext.createAnalyser()
        analyserNode.fftSize = 256

        const audioBuffer = await audioContext.decodeAudioData(
          arrayBuffer.slice(0),
        )
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(analyserNode)
        analyserNode.connect(audioContext.destination)

        sourceRef.current = source
        setAnalyser(analyserNode)
        setIsSpeaking(true)

        source.onended = () => stop()
        source.start(0)
      } catch {
        stop()
      }
    },
    [stop],
  )

  return { isSpeaking, analyser, speak, stop }
}
