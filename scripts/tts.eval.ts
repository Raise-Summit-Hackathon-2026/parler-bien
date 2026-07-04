import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  buildSpeechInput,
  pcmToWav,
  selectVoice,
  TTS_MODEL,
  type TtsRequestOptions,
  type TtsStyle,
} from "../lib/tts"

const OPENROUTER_SPEECH_URL = "https://openrouter.ai/api/v1/audio/speech"

type TtsEvalCase = {
  /** Short id used in filenames */
  id: string
  /** Human label for the report */
  label: string
  /** Language tag for the report */
  lang: "en" | "fr" | "es"
  /** App TTS style; this drives the production `buildSpeechInput` path */
  style: TtsStyle
  /** SFW transcript. Inline Gemini tags are intentional silent delivery cues. */
  text: string
  /** Options passed to `buildSpeechInput`, matching the app's TTS route shape */
  options?: TtsRequestOptions
  /** Voice override. Defaults to the app's `selectVoice(options.gender)`. */
  voice?: string
}

type Result = {
  id: string
  label: string
  lang: string
  style: TtsStyle
  voice: string
  text: string
  speechInputFile: string
  pcmFile?: string
  wavFile?: string
  pcmBytes?: number
  wavBytes?: number
  error?: string
}

const CASES: TtsEvalCase[] = [
  {
    id: "en-library-whisper",
    label: "English library scene - whisper, curiosity, and giggle tags",
    lang: "en",
    style: "character",
    text: "[whispers] The library is quiet today. [curious] Can you find the blue book on the top shelf? [giggles] Careful, it squeaks.",
    options: {
      gender: "female",
      ageRange: "25-35",
      tone: "Calm, friendly librarian. Gentle, clear, and a little playful.",
      accent: "British English",
    },
  },
  {
    id: "en-train-excited",
    label: "English travel scene - excited, gasp, and soft laugh tags",
    lang: "en",
    style: "character",
    text: "[gasps] Platform seven! [excited] You found it! [laughs softly] Perfect, now we will catch the train on time.",
    options: {
      gender: "male",
      ageRange: "35-45",
      tone: "Helpful station guide. Energetic, practical, and encouraging.",
      accent: "American English",
    },
  },
  {
    id: "fr-slow-phrase",
    label: "French phrase practice - slow gravity tag",
    lang: "fr",
    style: "phrase",
    text: "[slowly, with gravity] Le train part dans cinq minutes.",
    options: {
      accent: "Parisian French",
    },
  },
  {
    id: "en-cafe-background-music",
    label: "English cafe tutor - ambience and gentle music",
    lang: "en",
    style: "character",
    text: "[soft cafe ambience] Welcome in. [gentle background music] Today's tiny phrase is simple: I would like a coffee, please.",
    options: {
      gender: "female",
      ageRange: "30-40",
      tone: "Warm cafe tutor. Relaxed, clear, and lightly cheerful.",
      accent: "American English",
    },
  },
  {
    id: "fr-rainy-window",
    label: "French rainy window - rain ambience and soft delivery",
    lang: "fr",
    style: "character",
    text: "[rain outside] Écoute la pluie. [softly] Maintenant répète: je reste à la maison aujourd'hui.",
    options: {
      gender: "female",
      ageRange: "35-45",
      tone: "Calm neighbor by a rainy window. Cozy, patient, and reflective.",
      accent: "Parisian French",
    },
  },
  {
    id: "en-magic-trick",
    label: "English magic trick - gasp, giggle, and big reveal",
    lang: "en",
    style: "character",
    text: "[mysteriously] Watch the red card closely. [gasps] It vanished! [giggles] No, wait... it is behind your ear.",
    options: {
      gender: "female",
      ageRange: "25-35",
      tone: "Playful stage magician. Bright, theatrical, and delighted by the trick.",
      accent: "American English",
    },
  },
  {
    id: "en-quiz-drumroll",
    label: "English quiz show - drumroll, suspense, and cheer",
    lang: "en",
    style: "character",
    text: "[drumroll] The answer is... [dramatic pause] croissant! [cheers] You win today's pronunciation round.",
    options: {
      gender: "male",
      ageRange: "30-40",
      tone: "Friendly quiz show host. Comedic, suspenseful, and encouraging.",
      accent: "British English",
    },
  },
  {
    id: "en-platform-chime",
    label: "English train station - distant chime and crowd ambience",
    lang: "en",
    style: "character",
    text: "[distant train chime] The next train is arriving soon. [station ambience] Please practice this line with me: which platform is this?",
    options: {
      gender: "male",
      ageRange: "35-45",
      tone: "Helpful station announcer. Clear, warm, and practical.",
      accent: "British English",
    },
  },
  {
    id: "fr-bakery-happy-sigh",
    label: "French bakery scene - happy sigh and laugh",
    lang: "fr",
    style: "character",
    text: "[sighs happily] Ça sent le pain chaud. [laughs softly] Impossible de résister, n'est-ce pas?",
    options: {
      gender: "female",
      ageRange: "35-45",
      tone: "Warm boulangerie owner. Cheerful, cozy, and proud of the bread.",
      accent: "Parisian French",
    },
  },
  {
    id: "fr-coach-encouraging",
    label: "French coach - encouraging correction",
    lang: "fr",
    style: "coach",
    text: "[encouragingly] Tres bien. Maintenant, arrondis un peu plus le son dans le mot bonjour.",
    options: {
      gender: "female",
      ageRange: "30-40",
      accent: "Parisian French",
    },
  },
  {
    id: "es-cafe-curious",
    label: "Spanish cafe scene - curious, hmm, and encouraging tags",
    lang: "es",
    style: "character",
    text: "[curious] ¿Quieres practicar otra frase? [thinking hum] Mmm... [encouragingly] Vas muy bien.",
    options: {
      gender: "female",
      ageRange: "30-40",
      tone: "Warm cafe tutor. Patient, upbeat, and conversational.",
      accent: "Mexican Spanish",
    },
  },
  {
    id: "es-surprise-party",
    label: "Spanish surprise scene - whisper, gasp, and cheer",
    lang: "es",
    style: "character",
    text: "[whispers] Abre la puerta despacio. [gasps] ¡Sorpresa! [laughs] Practicaste perfecto.",
    options: {
      gender: "female",
      ageRange: "25-35",
      tone: "Joyful friend at a surprise party. Bright, warm, and playful.",
      accent: "Mexican Spanish",
    },
  },
  {
    id: "es-market-coins",
    label: "Spanish market scene - crowd ambience and coins",
    lang: "es",
    style: "character",
    text: "[lively market ambience] Buenos días. [coins clinking] Son tres euros, pero para practicar, repite conmigo: ¿cuánto cuesta?",
    options: {
      gender: "male",
      ageRange: "45-55",
      tone: "Friendly market vendor. Warm, lively, and a little theatrical.",
      accent: "Mexican Spanish",
    },
  },
  {
    id: "en-directed-prod",
    label: "Production path - director brief must not be spoken",
    lang: "en",
    style: "character",
    text: "Good morning. Welcome to the museum tour. Please follow me to the first gallery.",
    options: {
      gender: "female",
      ageRange: "40-50",
      tone: "Speak like a calm museum guide: measured pace, warm authority, clear pronunciation.",
      accent: "British English",
    },
  },
]

function bytesLabel(bytes?: number) {
  return typeof bytes === "number" ? `${bytes.toLocaleString()} bytes` : "n/a"
}

async function generatePcm(apiKey: string, voice: string, input: string) {
  const response = await fetch(OPENROUTER_SPEECH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Parler Bien TTS Eval",
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice,
      input,
      response_format: "pcm",
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await response.text()}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set")
    process.exit(1)
  }

  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const outDir = join(scriptDir, "tts-samples")
  mkdirSync(outDir, { recursive: true })

  console.log(`Testing ${CASES.length} SFW TTS samples with ${TTS_MODEL}\n`)

  const results: Result[] = []

  for (const c of CASES) {
    const voice = c.voice ?? selectVoice(c.options?.gender)
    const speechInput = buildSpeechInput(c.text, c.style, c.options)
    const base = `${c.id}-${voice}`
    const speechInputFile = `${base}.input.txt`
    writeFileSync(join(outDir, speechInputFile), speechInput)

    console.log(`[${c.lang}] ${c.label} - ${c.style}, voice ${voice}`)

    try {
      const pcm = await generatePcm(apiKey, voice, speechInput)
      const wav = pcmToWav(pcm)
      const pcmFile = `${base}.pcm`
      const wavFile = `${base}.wav`

      writeFileSync(join(outDir, pcmFile), pcm)
      writeFileSync(join(outDir, wavFile), wav)

      console.log(`  ok: pcm ${pcm.length}b -> wav ${wav.length}b`)
      results.push({
        id: c.id,
        label: c.label,
        lang: c.lang,
        style: c.style,
        voice,
        text: c.text,
        speechInputFile,
        pcmFile,
        wavFile,
        pcmBytes: pcm.length,
        wavBytes: wav.length,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  error: ${message}`)
      results.push({
        id: c.id,
        label: c.label,
        lang: c.lang,
        style: c.style,
        voice,
        text: c.text,
        speechInputFile,
        error: message,
      })
    }
  }

  const report = `# TTS Evaluation Results

Generated: ${new Date().toISOString()}

Model: \`${TTS_MODEL}\`

Audio saved to \`tts-samples/\`.

- \`.pcm\` is OpenRouter's raw Gemini output: signed 16-bit little-endian, 24 kHz, mono.
- \`.wav\` is the playable browser format produced by the same \`pcmToWav()\` helper used by the app.
- \`.input.txt\` is the exact prompt sent to OpenRouter, including the guarded \`PERFORMANCE\` block and transcript.

## Samples

${results
  .map((r) => {
    const lines = [
      `### ${r.label} (${r.lang}, ${r.style}, voice: ${r.voice})`,
      "",
      `- **Transcript**: \`${r.text}\``,
      `- **Speech input**: \`tts-samples/${r.speechInputFile}\``,
    ]

    if (r.error) {
      lines.push(`- **Error**: ${r.error}`)
    } else {
      lines.push(
        `- **PCM**: \`tts-samples/${r.pcmFile}\` (${bytesLabel(r.pcmBytes)})`,
        `- **WAV**: \`tts-samples/${r.wavFile}\` (${bytesLabel(r.wavBytes)})`,
      )
    }

    return lines.join("\n")
  })
  .join("\n\n")}

## Summary

- **Total samples**: ${results.length}
- **Successful**: ${results.filter((r) => !r.error).length}
- **Errors**: ${results.filter((r) => r.error).length}

## Listening Checklist

- Bracket tags such as \`[whispers]\`, \`[laughs softly]\`, and \`[excited]\` should affect delivery but should not be spoken aloud.
- The directed production sample should not read the \`PERFORMANCE\` instructions or section labels.
- Phrase and coach samples should keep clear pronunciation for language practice.
`

  const reportPath = join(scriptDir, "tts.eval.md")
  writeFileSync(reportPath, report, "utf-8")

  console.log(`\nResults saved to: ${reportPath}`)
  console.log(`Audio samples saved to: ${outDir}`)
}

void main()
