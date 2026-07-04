"use client"

import { useEffect, useRef } from "react"

type VoiceActivityOptions = {
  analyser: AnalyserNode | null
  enabled: boolean
  /** ms of silence after speech before firing */
  silenceMs?: number
  /** min RMS to count as speech */
  speechThreshold?: number
  onUtteranceEnd: () => void
}

function rmsFromAnalyser(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteTimeDomainData(data)
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / data.length)
}

/** Detect end of speech from mic analyser (simple VAD). */
export function useVoiceActivity({
  analyser,
  enabled,
  silenceMs = 1400,
  speechThreshold = 0.018,
  onUtteranceEnd,
}: VoiceActivityOptions) {
  const speechStartedRef = useRef(false)
  const silenceSinceRef = useRef<number | null>(null)
  const firedRef = useRef(false)
  const callbackRef = useRef(onUtteranceEnd)
  callbackRef.current = onUtteranceEnd

  useEffect(() => {
    speechStartedRef.current = false
    silenceSinceRef.current = null
    firedRef.current = false
  }, [enabled, analyser])

  useEffect(() => {
    if (!enabled || !analyser) return

    const interval = window.setInterval(() => {
      const rms = rmsFromAnalyser(analyser)
      const now = Date.now()

      if (rms >= speechThreshold) {
        speechStartedRef.current = true
        silenceSinceRef.current = null
        firedRef.current = false
        return
      }

      if (!speechStartedRef.current || firedRef.current) return

      if (silenceSinceRef.current === null) {
        silenceSinceRef.current = now
        return
      }

      if (now - silenceSinceRef.current >= silenceMs) {
        firedRef.current = true
        speechStartedRef.current = false
        silenceSinceRef.current = null
        callbackRef.current()
      }
    }, 80)

    return () => window.clearInterval(interval)
  }, [analyser, enabled, silenceMs, speechThreshold])
}
