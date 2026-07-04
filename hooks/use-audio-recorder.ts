"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const SILENCE_AUTO_STOP_MS = 3000
const SPEECH_PRIME_MS = 300
const MIN_SPEECH_MS = 120
const NOISE_FLOOR_BLEND = 0.04
const NOISE_FLOOR_DECAY_BLEND = 0.01
const MIN_FREQUENCY_MARGIN = 3.5
const MIN_RMS_MARGIN = 0.004

type RecordedAudio = {
  base64: string
  format: string
}

type VoiceActivityState = {
  activeSpeechMs: number
  lastFrameAt: number
  lastSpeechAt: number | null
  noiseFloorFrequency: number
  noiseFloorRms: number
  recordingStartedAt: number
  speechDetected: boolean
}

type UseAudioRecorderOptions = {
  onAutoStop?: (audio: RecordedAudio | null) => void | Promise<void>
}

function getSupportedMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }

  return ""
}

function mimeToFormat(mimeType: string) {
  if (mimeType.includes("webm")) return "webm"
  if (mimeType.includes("ogg")) return "ogg"
  if (mimeType.includes("mp4")) return "m4a"
  return "wav"
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Failed to read audio"))
        return
      }
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = () => reject(new Error("Failed to read audio"))
    reader.readAsDataURL(blob)
  })
}

function getBandAverage(
  data: Uint8Array,
  binWidth: number,
  minHz: number,
  maxHz: number
) {
  const start = Math.max(1, Math.floor(minHz / binWidth))
  const end = Math.min(data.length - 1, Math.ceil(maxHz / binWidth))
  if (end < start) return 0

  let total = 0
  for (let i = start; i <= end; i++) {
    total += data[i]
  }

  return total / (end - start + 1)
}

function getRms(data: Uint8Array) {
  let total = 0

  for (const value of data) {
    const centered = (value - 128) / 128
    total += centered * centered
  }

  return Math.sqrt(total / data.length)
}

function isSpeechLikeFrame(
  frequencyData: Uint8Array,
  timeData: Uint8Array,
  audioContext: AudioContext,
  analyserNode: AnalyserNode,
  state: VoiceActivityState
) {
  const binWidth = audioContext.sampleRate / analyserNode.fftSize
  const nyquist = audioContext.sampleRate / 2
  const rms = getRms(timeData)
  const speechBand = getBandAverage(frequencyData, binWidth, 120, 3800)
  const lowRumble = getBandAverage(frequencyData, binWidth, 20, 110)
  const upperNoise = getBandAverage(
    frequencyData,
    binWidth,
    5000,
    Math.min(8000, nyquist)
  )

  const frequencyMargin = Math.max(
    MIN_FREQUENCY_MARGIN,
    state.noiseFloorFrequency * 0.35
  )
  const rmsMargin = Math.max(MIN_RMS_MARGIN, state.noiseFloorRms * 0.7)
  const aboveFrequencyFloor =
    speechBand > state.noiseFloorFrequency + frequencyMargin
  const aboveRmsFloor = rms > state.noiseFloorRms + rmsMargin
  const voiceBandPresent = speechBand > 4 || rms > 0.018
  const rumbleDominant = lowRumble > speechBand * 1.9 && speechBand < 18
  const hissDominant = upperNoise > speechBand * 2.2 && speechBand < 16
  const speechLike =
    voiceBandPresent &&
    !rumbleDominant &&
    !hissDominant &&
    (aboveFrequencyFloor || aboveRmsFloor)

  if (!speechLike) {
    const frequencyBlend =
      speechBand < state.noiseFloorFrequency
        ? NOISE_FLOOR_DECAY_BLEND
        : NOISE_FLOOR_BLEND
    const rmsBlend =
      rms < state.noiseFloorRms ? NOISE_FLOOR_DECAY_BLEND : NOISE_FLOOR_BLEND
    state.noiseFloorFrequency =
      state.noiseFloorFrequency * (1 - frequencyBlend) +
      speechBand * frequencyBlend
    state.noiseFloorRms = state.noiseFloorRms * (1 - rmsBlend) + rms * rmsBlend
    return false
  }

  state.noiseFloorFrequency = Math.min(
    state.noiseFloorFrequency * (1 - NOISE_FLOOR_DECAY_BLEND) +
      speechBand * NOISE_FLOOR_DECAY_BLEND,
    speechBand - frequencyMargin
  )
  state.noiseFloorRms = Math.min(
    state.noiseFloorRms * (1 - NOISE_FLOOR_DECAY_BLEND) +
      rms * NOISE_FLOOR_DECAY_BLEND,
    rms - rmsMargin
  )
  return true
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recordingDurationMs, setRecordingDurationMs] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const autoStopRef = useRef(options.onAutoStop)
  const durationIntervalRef = useRef<number | null>(null)
  const voiceActivityFrameRef = useRef<number | null>(null)
  const voiceActivityStateRef = useRef<VoiceActivityState | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    autoStopRef.current = options.onAutoStop
  }, [options.onAutoStop])

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current !== null) {
      window.clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (voiceActivityFrameRef.current !== null) {
      cancelAnimationFrame(voiceActivityFrameRef.current)
      voiceActivityFrameRef.current = null
    }
    voiceActivityStateRef.current = null

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
    }
    mediaRecorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
    setAnalyser(null)
    setIsRecording(false)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === "inactive") {
      cleanup()
      return null
    }

    const mimeType = recorder.mimeType
    mediaRecorderRef.current = null

    return new Promise<RecordedAudio | null>((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        cleanup()

        if (blob.size === 0) {
          resolve(null)
          return
        }

        const base64 = await blobToBase64(blob)
        resolve({ base64, format: mimeToFormat(mimeType) })
      }

      recorder.stop()
    })
  }, [cleanup])

  const startVoiceActivityMonitor = useCallback(
    (audioContext: AudioContext, analyserNode: AnalyserNode) => {
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount)
      const timeData = new Uint8Array(analyserNode.fftSize)
      const startedAt = performance.now()
      voiceActivityStateRef.current = {
        activeSpeechMs: 0,
        lastFrameAt: startedAt,
        lastSpeechAt: null,
        noiseFloorFrequency: 3,
        noiseFloorRms: 0.01,
        recordingStartedAt: startedAt,
        speechDetected: false,
      }

      const tick = async (now: number) => {
        const state = voiceActivityStateRef.current
        if (!state || mediaRecorderRef.current?.state !== "recording") return

        const deltaMs = Math.max(0, now - state.lastFrameAt)
        state.lastFrameAt = now

        analyserNode.getByteFrequencyData(frequencyData)
        analyserNode.getByteTimeDomainData(timeData)
        const isPriming = now - state.recordingStartedAt < SPEECH_PRIME_MS
        const speechLikeFrame = isSpeechLikeFrame(
          frequencyData,
          timeData,
          audioContext,
          analyserNode,
          state
        )
        const speechLike = !isPriming && speechLikeFrame

        if (speechLike) {
          state.activeSpeechMs += deltaMs
          if (state.activeSpeechMs >= MIN_SPEECH_MS) {
            state.speechDetected = true
            state.lastSpeechAt = now
          }
        } else {
          state.activeSpeechMs = Math.max(0, state.activeSpeechMs - deltaMs * 2)
        }

        if (
          state.speechDetected &&
          state.lastSpeechAt !== null &&
          now - state.lastSpeechAt >= SILENCE_AUTO_STOP_MS
        ) {
          voiceActivityFrameRef.current = null
          const audio = await stopRecording()
          await autoStopRef.current?.(audio)
          return
        }

        voiceActivityFrameRef.current = requestAnimationFrame(tick)
      }

      voiceActivityFrameRef.current = requestAnimationFrame(tick)
    },
    [stopRecording]
  )

  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 1024
      analyserNode.smoothingTimeConstant = 0.45
      source.connect(analyserNode)
      setAnalyser(analyserNode)

      const mimeType = getSupportedMimeType()
      if (!mimeType) {
        throw new Error("Audio recording is not supported in this browser")
      }

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.start(100)
      const startedAt = performance.now()
      setRecordingDurationMs(0)
      durationIntervalRef.current = window.setInterval(() => {
        setRecordingDurationMs(performance.now() - startedAt)
      }, 250)
      startVoiceActivityMonitor(audioContext, analyserNode)
      setIsRecording(true)
    } catch (err) {
      cleanup()
      setError(
        err instanceof Error
          ? err.message
          : "Microphone access denied or unavailable"
      )
    }
  }, [cleanup, startVoiceActivityMonitor])

  return {
    isRecording,
    analyser,
    error,
    recordingDurationMs,
    startRecording,
    stopRecording,
  }
}
