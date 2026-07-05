export type GestureKind = "seatbelt" | "point_exit" | "palms_down"

export type GestureStep = {
  id: string
  kind: GestureKind
  title: string
  instruction: string
}

export type NormalizedLandmark = { x: number; y: number; z?: number }

export type HandLandmarks = NormalizedLandmark[]

const HOLD_MS_DEFAULT = 1400

export function gestureHoldMs(steps?: { holdMs?: number }): number {
  return steps?.holdMs ?? HOLD_MS_DEFAULT
}

function dist(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function indexExtended(hand: HandLandmarks): boolean {
  const wrist = hand[0]
  const indexTip = hand[8]
  const middleTip = hand[12]
  if (!wrist || !indexTip || !middleTip) return false
  return dist(wrist, indexTip) > dist(wrist, middleTip) * 0.85
}

export function detectSeatbelt(hands: HandLandmarks[]): boolean {
  if (hands.length < 2) return false
  const [a, b] = hands
  const wA = a[0]
  const wB = b[0]
  if (!wA || !wB) return false

  const midY = (wA.y + wB.y) / 2
  if (midY < 0.38 || midY > 0.78) return false
  if (Math.abs(wA.y - wB.y) > 0.14) return false
  if (Math.abs(wA.x - wB.x) < 0.08 || Math.abs(wA.x - wB.x) > 0.55) return false

  return true
}

export function detectPointExit(hands: HandLandmarks[]): boolean {
  for (const hand of hands) {
    const wrist = hand[0]
    const indexTip = hand[8]
    if (!wrist || !indexTip) continue
    if (indexTip.y < wrist.y - 0.12 && indexExtended(hand)) {
      return true
    }
  }
  return false
}

export function detectPalmsDown(hands: HandLandmarks[]): boolean {
  if (hands.length < 2) return false

  return hands.every((hand) => {
    const wrist = hand[0]
    const indexTip = hand[8]
    const middleTip = hand[12]
    if (!wrist || !indexTip || !middleTip) return false
    if (wrist.y > 0.58) return false
    return indexTip.y > wrist.y - 0.02 && middleTip.y > wrist.y - 0.02
  })
}

export function detectGesture(
  kind: GestureKind,
  hands: HandLandmarks[],
): boolean {
  switch (kind) {
    case "seatbelt":
      return detectSeatbelt(hands)
    case "point_exit":
      return detectPointExit(hands)
    case "palms_down":
      return detectPalmsDown(hands)
  }
}

export const CABIN_SAFETY_GESTURES: GestureStep[] = [
  {
    id: "seatbelt",
    kind: "seatbelt",
    title: "Fasten seatbelt",
    instruction: "Cross both hands at your waist — show how to buckle the belt.",
  },
  {
    id: "point_exit",
    kind: "point_exit",
    title: "Point to exits",
    instruction: "Raise one hand and point upward toward the aisle — exit signs.",
  },
  {
    id: "palms_down",
    kind: "palms_down",
    title: "Brace position",
    instruction: "Hold both palms down in front of you at shoulder height.",
  },
]

export const SERVICE_GESTURES: GestureStep[] = [
  {
    id: "menu",
    kind: "palms_down",
    title: "Present the menu",
    instruction: "Hold both palms open at chest height — as if offering a menu.",
  },
  {
    id: "table",
    kind: "point_exit",
    title: "Guide to the table",
    instruction: "Point with one hand down the aisle toward the table.",
  },
  {
    id: "napkin",
    kind: "seatbelt",
    title: "Fold the napkin",
    instruction: "Cross both hands at waist level — show a crisp napkin fold.",
  },
]

export const SPORTS_PEP_GESTURES: GestureStep[] = [
  {
    id: "huddle",
    kind: "seatbelt",
    title: "Call the huddle",
    instruction: "Cross both arms at chest level — bring the team in tight.",
  },
  {
    id: "tactics",
    kind: "point_exit",
    title: "Point to the pitch",
    instruction: "Point firmly toward the field — where the second half starts.",
  },
  {
    id: "calm",
    kind: "palms_down",
    title: "Hands down, breathe",
    instruction: "Hold both palms down at shoulder height — steady the room.",
  },
]

export const INTERVIEW_PRESENCE_GESTURES: GestureStep[] = [
  {
    id: "handshake",
    kind: "seatbelt",
    title: "Confident handshake",
    instruction: "Cross both hands at waist level — a firm, brief handshake.",
  },
  {
    id: "eye_contact",
    kind: "point_exit",
    title: "Direct eye contact",
    instruction: "Point one finger toward your temple — engaged, attentive eye contact.",
  },
  {
    id: "open_posture",
    kind: "palms_down",
    title: "Open posture",
    instruction: "Hold both palms open at chest height — relaxed, open body language.",
  },
]
