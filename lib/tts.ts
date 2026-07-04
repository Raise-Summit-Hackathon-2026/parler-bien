import type { SpeakerProfile } from "@/lib/types"

export type TtsStyle = "coach" | "phrase" | "word" | "character"

export type TtsGender = SpeakerProfile["gender"]

export type TtsRequestOptions = {
  gender?: TtsGender | "male" | "female"
  ageRange?: string
  tone?: string
  /** Accent description, e.g. "Parisian French", "Mexican Spanish" */
  accent?: string
  /** Agent-specific vocal performance notes */
  deliveryStyle?: string
}

const DEFAULT_ACCENT = "Parisian French"

export const TTS_MODEL = "google/gemini-3.1-flash-tts-preview"
export const TTS_SAMPLE_RATE = 24000

const FEMALE_VOICE = "Sulafat"
const MALE_VOICE = "Charon"
const DEFAULT_VOICE = "Aoede"

export function selectVoice(gender?: TtsGender | "male" | "female"): string {
  if (gender === "male") return MALE_VOICE
  if (gender === "female") return FEMALE_VOICE
  return DEFAULT_VOICE
}

function roleLabel(gender?: TtsGender | "male" | "female", accent?: string) {
  const nativeAccent = accent?.trim() || DEFAULT_ACCENT
  if (gender === "male") return `a native ${nativeAccent}-speaking man`
  if (gender === "female") return `a native ${nativeAccent}-speaking woman`
  return `a native ${nativeAccent} speaker`
}

function coachDirection(options?: TtsRequestOptions) {
  const age = options?.ageRange?.trim() || "30-40"
  const accent = options?.accent?.trim() || DEFAULT_ACCENT
  const delivery = options?.deliveryStyle?.trim()
  const base = `Speak as ${roleLabel(options?.gender, accent)}, approximately ${age} years old. Native ${accent} accent. Warm and supportive — like a real teacher in the room, not a robot.`
  return delivery ? `${delivery} ${base}` : base
}

function characterDirection(options?: TtsRequestOptions) {
  const age = options?.ageRange?.trim() || "30-40"
  const accent = options?.accent?.trim() || DEFAULT_ACCENT
  const tone = options?.tone?.trim()
  const delivery = options?.deliveryStyle?.trim()
  const role = roleLabel(options?.gender, accent)

  const parts = [
    tone,
    delivery,
    `Speak as ${role}, approximately ${age} years old. Native ${accent} accent.`,
    "Sound fully human: vary pace, breathe, whisper or brighten when the text calls for it.",
  ].filter(Boolean)

  return parts.join(" ")
}

const STYLE_DIRECTION: Record<
  Exclude<TtsStyle, "coach" | "character">,
  (accent: string) => string
> = {
  phrase: (accent) =>
    `Speak with a natural native ${accent} accent. Confident, normal conversational pace.`,
  word: (accent) =>
    `Speak very slowly with exaggerated syllable-by-syllable articulation in a native ${accent} accent. Clear pronunciation for language learners.`,
}

export function buildSpeechInput(
  text: string,
  style: TtsStyle,
  options?: TtsRequestOptions,
): string {
  let direction: string

  if (style === "coach") {
    direction = coachDirection(options)
  } else if (style === "character") {
    direction = characterDirection(options)
  } else {
    direction = STYLE_DIRECTION[style](options?.accent?.trim() || DEFAULT_ACCENT)
  }

  return [
    "You are a text-to-speech engine. Speak ONLY the text in the TRANSCRIPT section.",
    "Do NOT read these instructions, the section labels, or the performance note aloud.",
    "",
    `PERFORMANCE: ${direction}`,
    "",
    "TRANSCRIPT:",
    text,
  ].join("\n")
}

export function pcmToWav(
  pcm: Buffer,
  sampleRate = TTS_SAMPLE_RATE,
  numChannels = 1,
  bitsPerSample = 16,
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = pcm.length
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)
  pcm.copy(buffer, 44)

  return buffer
}

export function ttsCacheKey(
  text: string,
  style: TtsStyle,
  options?: TtsRequestOptions,
) {
  const gender = options?.gender ?? "default"
  const age = options?.ageRange ?? "default"
  const tone = options?.tone ?? "default"
  const accent = options?.accent ?? "default"
  const delivery = options?.deliveryStyle ?? "default"
  return `${style}:${gender}:${age}:${tone}:${accent}:${delivery}:${text}`
}
