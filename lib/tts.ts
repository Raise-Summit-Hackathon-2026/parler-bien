export type TtsStyle = "coach" | "phrase" | "word"

export const TTS_MODEL = "google/gemini-3.1-flash-tts-preview"
export const TTS_VOICE = "Sulafat"
export const TTS_SAMPLE_RATE = 24000

const STYLE_DIRECTION: Record<TtsStyle, string> = {
  coach:
    "Speak with a soft Parisian French accent. Warm, intimate, slightly playful and flirtatious. Never cartoonish.",
  phrase:
    "Speak with a natural native Parisian French accent. Confident, normal conversational pace.",
  word: "Speak very slowly with exaggerated syllable-by-syllable articulation. Clear pronunciation for language learners.",
}

export function buildSpeechInput(text: string, style: TtsStyle): string {
  const direction = STYLE_DIRECTION[style]

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

export function ttsCacheKey(text: string, style: TtsStyle) {
  return `${style}:${text}`
}
