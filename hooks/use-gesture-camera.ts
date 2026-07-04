"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  detectGesture,
  type GestureKind,
  type HandLandmarks,
} from "@/lib/gestures"

type HandLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => { landmarks: HandLandmarks[] }
}

type UseGestureCameraOptions = {
  active: boolean
  targetKind: GestureKind | null
  holdMs?: number
  onGestureHeld: () => void
}

export function useGestureCamera({
  active,
  targetKind,
  holdMs = 1400,
  onGestureHeld,
}: UseGestureCameraOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<HandLandmarkerInstance | null>(null)
  const rafRef = useRef<number>(0)
  const holdStartRef = useRef<number | null>(null)
  const onHeldRef = useRef(onGestureHeld)

  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matching, setMatching] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [hands, setHands] = useState<HandLandmarks[]>([])

  useEffect(() => {
    onHeldRef.current = onGestureHeld
  }, [onGestureHeld])

  useEffect(() => {
    if (!active) return

    let cancelled = false

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play()

        const { HandLandmarker, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        )

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
        )

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        })

        if (cancelled) return
        landmarkerRef.current = landmarker
        setReady(true)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Camera access denied or gesture model failed to load",
        )
      }
    }

    void init()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      const video = videoRef.current
      const stream = video?.srcObject as MediaStream | null
      stream?.getTracks().forEach((t) => t.stop())
      landmarkerRef.current = null
      holdStartRef.current = null
      setReady(false)
      setMatching(false)
      setHoldProgress(0)
    }
  }, [active])

  const drawOverlay = useCallback(
    (landmarkSets: HandLandmarks[], isMatch: boolean) => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = isMatch ? "#10b981" : "#f59e0b"
      ctx.lineWidth = 3

      for (const hand of landmarkSets) {
        for (const point of hand) {
          ctx.beginPath()
          ctx.arc(point.x * w, point.y * h, 5, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (!active || !ready || !targetKind) return

    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !landmarker) return

    holdStartRef.current = null
    setHoldProgress(0)
    setMatching(false)

    function loop() {
      const lm = landmarkerRef.current
      const vid = videoRef.current
      if (!lm || !vid || vid.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const result = lm.detectForVideo(vid, performance.now())
      const landmarkSets = result.landmarks ?? []
      setHands(landmarkSets)

      const isMatch =
        targetKind !== null && detectGesture(targetKind, landmarkSets)
      setMatching(isMatch)
      drawOverlay(landmarkSets, isMatch)

      if (isMatch) {
        if (holdStartRef.current === null) {
          holdStartRef.current = performance.now()
        }
        const elapsed = performance.now() - holdStartRef.current
        setHoldProgress(Math.min(1, elapsed / holdMs))
        if (elapsed >= holdMs) {
          holdStartRef.current = null
          setHoldProgress(0)
          onHeldRef.current()
        }
      } else {
        holdStartRef.current = null
        setHoldProgress(0)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, ready, targetKind, holdMs, drawOverlay])

  return {
    videoRef,
    canvasRef,
    ready,
    error,
    matching,
    holdProgress,
    hands,
  }
}
