import type { PronunciationScore } from "@/lib/types"

/** Minimum pronunciation clarity before meter can rise */
export const METER_QUALITY_THRESHOLD = 55

/**
 * Only advance goal meter when the user's attempt was intelligible and on-topic.
 * Poor attempts hold or slightly decrease progress.
 */
export function resolveMeterUpdate(
  currentMeter: number,
  result: PronunciationScore,
): number {
  const proposed = result.meter

  if (result.overall_score < METER_QUALITY_THRESHOLD) {
    return Math.max(0, currentMeter - 8)
  }

  if (proposed <= currentMeter) {
    return proposed
  }

  const delta = proposed - currentMeter
  const maxBump =
    result.overall_score >= 80 ? 18 : result.overall_score >= 65 ? 12 : 6

  return Math.min(100, currentMeter + Math.min(delta, maxBump))
}

export function wasStrongAttempt(result: PronunciationScore): boolean {
  return result.overall_score >= METER_QUALITY_THRESHOLD
}
