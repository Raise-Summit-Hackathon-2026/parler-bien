export type ChromaKeyOptions = {
  /**
   * green−blue difference (0–255) at/below which a pixel is treated as pure
   * foreground and kept fully opaque.
   */
  keyLow: number
  /**
   * green−blue difference at/above which a pixel is treated as background and
   * made fully transparent. Between keyLow and keyHigh alpha ramps smoothly.
   */
  keyHigh: number
  /** 0–1: how strongly to neutralise residual green/yellow spill. */
  despill: number
}

// Keying on (green − blue) instead of a green-only hue test is what makes this
// robust to lighting: a warm-lit green screen drifts toward yellow-green (red
// rises to ~green), which defeats a "green must beat red" test, but blue stays
// low in BOTH green and yellow-green — while skin, hair, and clothing keep blue
// much closer to green, so they survive the key.
export const DEFAULT_CHROMA_KEY_OPTIONS: ChromaKeyOptions = {
  keyLow: 55,
  keyHigh: 125,
  despill: 1,
}

export function applyChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  options: ChromaKeyOptions,
): void {
  const ctx = targetCanvas.getContext("2d", {
    willReadFrequently: true,
    alpha: true,
  })

  const width = sourceVideo.videoWidth
  const height = sourceVideo.videoHeight

  // Guard against the first frames, where the stream reports 0×0 and drawing
  // would blank the canvas — a common source of the "sometimes bad" flashes.
  if (!ctx || sourceVideo.readyState < 2 || width === 0 || height === 0) return

  targetCanvas.width = width
  targetCanvas.height = height

  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(sourceVideo, 0, 0, width, height)

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const { keyLow, keyHigh, despill } = options
  const range = keyHigh - keyLow || 1

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] as number
    const g = data[i + 1] as number
    const b = data[i + 2] as number

    const diff = g - b

    if (diff <= keyLow) {
      // Foreground. Gently suppress any pure-green spill (green above BOTH red
      // and blue); yellow-tinted skin has red ≥ green, so it stays untouched.
      const spill = g - Math.max(r, b)
      if (spill > 0) data[i + 1] = g - spill * despill * 0.5
      continue
    }

    if (diff >= keyHigh) {
      data[i + 3] = 0
      continue
    }

    // Fringe: ramp alpha and pull green toward blue to kill the coloured halo.
    const t = (diff - keyLow) / range
    data[i + 3] = Math.round((1 - t) * 255)
    data[i + 1] = Math.round(g - (g - b) * t * despill)
  }

  ctx.putImageData(imageData, 0, 0)
}

export function setupChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  options: ChromaKeyOptions,
): () => void {
  let animationFrameId: number | null = null

  const render = () => {
    applyChromaKey(sourceVideo, targetCanvas, options)
    animationFrameId = requestAnimationFrame(render)
  }

  render()

  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
  }
}
