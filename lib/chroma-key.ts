export type ChromaKeyOptions = {
  minHue: number
  maxHue: number
  minSaturation: number
  threshold: number
}

export const DEFAULT_CHROMA_KEY_OPTIONS: ChromaKeyOptions = {
  minHue: 60,
  maxHue: 180,
  minSaturation: 0.1,
  threshold: 1.0,
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

  if (!ctx || sourceVideo.readyState < 2) return

  targetCanvas.width = sourceVideo.videoWidth
  targetCanvas.height = sourceVideo.videoHeight

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
  ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height)

  const imageData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] as number
    const g = data[i + 1] as number
    const b = data[i + 2] as number

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let h = 0
    if (delta === 0) {
      h = 0
    } else if (max === r) {
      h = ((g - b) / delta) % 6
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360

    const s = max === 0 ? 0 : delta / max
    const v = max / 255

    const isGreen =
      h >= options.minHue &&
      h <= options.maxHue &&
      s > options.minSaturation &&
      v > 0.15 &&
      g > r * options.threshold &&
      g > b * options.threshold

    if (isGreen) {
      const greenness = (g - Math.max(r, b)) / (g || 1)
      const alphaValue = Math.max(0, 1 - greenness * 4)
      data[i + 3] = alphaValue < 0.2 ? 0 : Math.round(alphaValue * 255)
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

let workCanvas: HTMLCanvasElement | null = null

function getWorkCanvas() {
  if (!workCanvas) {
    workCanvas = document.createElement("canvas")
  }
  return workCanvas
}

export function setupChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  container: HTMLElement,
  options: ChromaKeyOptions,
): () => void {
  let animationFrameId: number | null = null
  const work = getWorkCanvas()

  const render = () => {
    if (sourceVideo.readyState < 2) {
      animationFrameId = requestAnimationFrame(render)
      return
    }

    applyChromaKey(sourceVideo, work, options)

    const ctx = targetCanvas.getContext("2d", { alpha: true })
    if (!ctx) {
      animationFrameId = requestAnimationFrame(render)
      return
    }

    const displayWidth = container.clientWidth
    const displayHeight = container.clientHeight
    if (displayWidth === 0 || displayHeight === 0) {
      animationFrameId = requestAnimationFrame(render)
      return
    }

    const dpr = window.devicePixelRatio || 1
    const canvasWidth = Math.round(displayWidth * dpr)
    const canvasHeight = Math.round(displayHeight * dpr)

    if (
      targetCanvas.width !== canvasWidth ||
      targetCanvas.height !== canvasHeight
    ) {
      targetCanvas.width = canvasWidth
      targetCanvas.height = canvasHeight
      targetCanvas.style.width = `${displayWidth}px`
      targetCanvas.style.height = `${displayHeight}px`
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    const scale = displayHeight / work.height
    const drawWidth = work.width * scale
    const drawHeight = displayHeight
    const drawX = (displayWidth - drawWidth) / 2

    ctx.drawImage(work, drawX, 0, drawWidth, drawHeight)
    animationFrameId = requestAnimationFrame(render)
  }

  render()

  const observer = new ResizeObserver(() => {
    // Dimensions are read each frame from container.clientWidth/Height.
  })
  observer.observe(container)

  return () => {
    observer.disconnect()
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
  }
}
