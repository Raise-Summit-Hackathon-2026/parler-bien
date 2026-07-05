import type { PronunciationScore } from "@/lib/types"

export const PROGRESS_LABEL = "Progress"

/** Minimum pronunciation clarity before progress can rise */
export const METER_QUALITY_THRESHOLD = 55

/**
 * Progress starts at 0 and reaches 100 when the goal is won.
 * Weak attempts reset to 0; strong on-topic attempts add progress.
 */
export function resolveMeterUpdate(
  currentMeter: number,
  result: PronunciationScore,
): number {
  const proposed = result.meter

  if (result.overall_score < METER_QUALITY_THRESHOLD) {
    return 0
  }

  if (proposed <= currentMeter) {
    return Math.max(0, proposed)
  }

  const delta = proposed - currentMeter
  const maxBump =
    result.overall_score >= 80 ? 15 : result.overall_score >= 65 ? 10 : 5

  return Math.min(100, currentMeter + Math.min(delta, maxBump))
}

export function wasStrongAttempt(result: PronunciationScore): boolean {
  return result.overall_score >= METER_QUALITY_THRESHOLD
}
