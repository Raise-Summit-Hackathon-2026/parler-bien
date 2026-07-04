"use client"

import { useCallback, useEffect, useRef, useState } from "react"

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

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const cleanup = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
    setAnalyser(null)
    setIsRecording(false)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 256
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
      setIsRecording(true)
    } catch (err) {
      cleanup()
      setError(
        err instanceof Error
          ? err.message
          : "Microphone access denied or unavailable",
      )
    }
  }, [cleanup])

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === "inactive") {
      cleanup()
      return null
    }

    const mimeType = recorder.mimeType

    return new Promise<{ base64: string; format: string } | null>((resolve) => {
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

  return {
    isRecording,
    analyser,
    error,
    startRecording,
    stopRecording,
  }
}
