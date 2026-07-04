"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

type WaveformProps = {
  analyser: AnalyserNode | null
  active?: boolean
  className?: string
}

export function Waveform({ analyser, active = false, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const bufferLength = analyser?.frequencyBinCount ?? 64
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const barCount = 48
      const gap = 3
      const barWidth = (width - gap * (barCount - 1)) / barCount

      for (let i = 0; i < barCount; i++) {
        let value = 0.08

        if (analyser && active) {
          analyser.getByteFrequencyData(dataArray)
          const index = Math.floor((i / barCount) * bufferLength)
          value = Math.max(0.08, dataArray[index] / 255)
        } else {
          value = 0.08 + Math.sin(Date.now() / 400 + i * 0.35) * 0.04
        }

        const barHeight = Math.max(4, value * height * 0.85)
        const x = i * (barWidth + gap)
        const y = (height - barHeight) / 2

        ctx.fillStyle = active
          ? `oklch(${0.55 + value * 0.2} 0.12 ${220 + i * 2})`
          : "oklch(0.75 0.02 260)"
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [analyser, active])

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-24 w-full max-w-md", className)}
      aria-hidden
    />
  )
}
