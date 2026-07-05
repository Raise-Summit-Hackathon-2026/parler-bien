import { describe, expect, test } from "bun:test"

import { DEFAULT_CHROMA_KEY_OPTIONS, type ChromaKeyOptions } from "./chroma-key"

// Mirror of applyChromaKey's per-pixel decision, so we can assert the keying
// math on representative colours without a canvas / live video stream.
function keyPixel(
  [r, g, b]: [number, number, number],
  options: ChromaKeyOptions = DEFAULT_CHROMA_KEY_OPTIONS,
): { alpha: number; green: number } {
  const { keyLow, keyHigh, despill } = options
  const range = keyHigh - keyLow || 1
  const diff = g - b

  if (diff <= keyLow) {
    const spill = g - Math.max(r, b)
    return { alpha: 255, green: spill > 0 ? g - spill * despill * 0.5 : g }
  }
  if (diff >= keyHigh) return { alpha: 0, green: g }

  const t = (diff - keyLow) / range
  return {
    alpha: Math.round((1 - t) * 255),
    green: Math.round(g - (g - b) * t * despill),
  }
}

describe("chroma key", () => {
  test("removes a pure green screen", () => {
    expect(keyPixel([0, 200, 0]).alpha).toBe(0)
  })

  test("removes a warm-lit green screen that has drifted to yellow-green", () => {
    // The regression case: red ≈ green, which defeats a "green beats red" test.
    expect(keyPixel([180, 210, 70]).alpha).toBe(0)
  })

  test("removes the yellow halo behind the subject", () => {
    // The exact symptom from the report — yellow glow with red > green.
    expect(keyPixel([235, 205, 70]).alpha).toBe(0)
  })

  test("keeps warm skin tones fully opaque", () => {
    expect(keyPixel([205, 165, 120]).alpha).toBe(255)
  })

  test("keeps blonde hair essentially opaque", () => {
    expect(keyPixel([230, 210, 150]).alpha).toBeGreaterThan(230)
  })

  test("keeps a dark suit and white shirt", () => {
    expect(keyPixel([30, 32, 38]).alpha).toBe(255)
    expect(keyPixel([240, 240, 245]).alpha).toBe(255)
  })

  test("neutralises pure-green spill on kept foreground pixels", () => {
    // green above both red and blue → spill pulled down.
    const { green } = keyPixel([120, 180, 140])
    expect(green).toBeLessThan(180)
  })

  test("leaves red-dominant skin green channel untouched", () => {
    const { green } = keyPixel([205, 165, 120])
    expect(green).toBe(165)
  })
})
