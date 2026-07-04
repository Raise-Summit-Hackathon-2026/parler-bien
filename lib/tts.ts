import type { SpeakerProfile } from "@/lib/types"

export type TtsStyle = "coach" | "phrase" | "word" | "character"

export type TtsGender = SpeakerProfile["gender"]

export type TtsRequestOptions = {
  gender?: TtsGender | "male" | "female"
  voice?: string
  ageRange?: string
  tone?: string
  /** Accent description, e.g. "Parisian French", "Mexican Spanish" */
  accent?: string
  /** Agent-specific vocal performance notes */
  deliveryStyle?: string
  userId?: string
}

const DEFAULT_ACCENT = "Parisian French"

export const TTS_MODEL = "google/gemini-3.1-flash-tts-preview"
export const TTS_SAMPLE_RATE = 24000

export const TTS_VOICES = [
  "Zephyr",
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Leda",
  "Orus",
  "Aoede",
  "Callirrhoe",
  "Autonoe",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Algieba",
  "Despina",
  "Erinome",
  "Algenib",
  "Rasalgethi",
  "Laomedeia",
  "Achernar",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Pulcherrima",
  "Achird",
  "Zubenelgenubi",
  "Vindemiatrix",
  "Sadachbia",
  "Sadaltager",
  "Sulafat",
] as const

export type TtsVoice = (typeof TTS_VOICES)[number]

const TTS_VOICE_SET = new Set<string>(TTS_VOICES)

const FEMALE_VOICE = "Sulafat"
const MALE_VOICE = "Charon"
const DEFAULT_VOICE = "Aoede"

export function isTtsVoice(voice?: string): voice is TtsVoice {
  return !!voice && TTS_VOICE_SET.has(voice)
}

export function selectVoice(
  gender?: TtsGender | "male" | "female",
  preferredVoice?: string,
): string {
  const trimmedVoice = preferredVoice?.trim()
  if (isTtsVoice(trimmedVoice)) return trimmedVoice
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

const INLINE_TAG_GUIDANCE = [
  "Inline square-bracket tags inside the transcript are performance cues, not words.",
  "Never read bracketed tags aloud; apply them at the exact point where they appear.",
  "Honor natural-language tags such as [whispers], [laughs softly], [giggles], [gasps], [sighs happily], [excited], [curious], [sarcastic], [drumroll], [slowly], or [slowly, with gravity].",
  "Honor subtle ambience tags such as [soft cafe ambience], [rain outside], [distant train chime], [coins clinking], or [gentle background music] when possible.",
  "For non-verbal cues, make the sound or vocal reaction when possible instead of saying the tag.",
  "Keep ambience and music quiet, generic, non-lyrical, and behind the voice; never let it overpower the spoken transcript.",
  "Let each tag shape the next phrase or clause, then return naturally unless another tag changes the delivery.",
  "If the transcript has no inline tags, perform it normally using the performance note.",
].join("\n")

export function buildSpeechInput(
  text: string,
  style: TtsStyle,
  options?: TtsRequestOptions
): string {
  let direction: string

  if (style === "coach") {
    direction = coachDirection(options)
  } else if (style === "character") {
    direction = characterDirection(options)
  } else {
    direction = STYLE_DIRECTION[style](
      options?.accent?.trim() || DEFAULT_ACCENT
    )
  }

  return [
    "You are a text-to-speech engine. Speak ONLY the text in the TRANSCRIPT section.",
    "Do NOT read these instructions, the section labels, or the performance note aloud.",
    INLINE_TAG_GUIDANCE,
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
  bitsPerSample = 16
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
  options?: TtsRequestOptions
) {
  const gender = options?.gender ?? "default"
  const voice = options?.voice ?? "default"
  const age = options?.ageRange ?? "default"
  const tone = options?.tone ?? "default"
  const accent = options?.accent ?? "default"
  const delivery = options?.deliveryStyle ?? "default"
  return `${style}:${gender}:${voice}:${age}:${tone}:${accent}:${delivery}:${text}`
}
