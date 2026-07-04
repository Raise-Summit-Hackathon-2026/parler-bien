# TTS Evaluation

This folder contains a small Bun-based evaluation script for the app's text-to-speech path.

The goal is to hear whether Gemini TTS handles inline performance tags, non-verbal reactions, and subtle ambience cues well, without putting those tags in visible UI text.

## Files

- `tts.eval.ts` generates SFW audio samples through OpenRouter.
- `../lib/tts.ts` contains the production prompt builder, voice selection, and PCM-to-WAV conversion.
- `../lib/tts.test.ts` checks the prompt contract for inline tags.

Generated files are written next to the script:

- `tts-samples/*.input.txt` - exact input sent to OpenRouter, including the guarded `PERFORMANCE` block and `TRANSCRIPT`.
- `tts-samples/*.pcm` - raw Gemini output from OpenRouter.
- `tts-samples/*.wav` - playable audio using the same `pcmToWav()` helper as the app.
- `tts.eval.md` - report with sample metadata and links to generated files.

## Run

Set `OPENROUTER_API_KEY`, then run:

```bash
bun run eval:tts
```

Equivalent direct command:

```bash
bun scripts/tts.eval.ts
```

The script exits early if `OPENROUTER_API_KEY` is missing.

## What It Tests

The current eval uses Gemini via:

```text
google/gemini-3.1-flash-tts-preview
```

It exercises the same production path as `/api/tts`:

1. Build speech input with `buildSpeechInput(text, style, options)`.
2. Send the guarded input to OpenRouter `/audio/speech`.
3. Request raw `pcm` output.
4. Convert PCM to playable WAV with `pcmToWav()`.

The SFW samples cover:

- Whisper, curiosity, and giggle tags in a quiet library scene.
- Excited delivery, a gasp, and a soft laugh in a train station scene.
- Slow phrase practice in French.
- Cafe ambience with gentle background music.
- Rain ambience with soft French delivery.
- A playful magic trick with mystery, gasp, giggle, and reveal cues.
- A quiz show beat with drumroll, suspense, and cheering.
- Train station chime and crowd ambience.
- A cozy French bakery line with a happy sigh and laugh.
- Encouraging coach feedback.
- Spanish cafe practice with curious, thinking-hum, and encouraging delivery.
- Spanish market ambience with coins clinking.
- A Spanish surprise-party line with whisper, gasp, laugh, and cheer energy.
- A directed production sample where the `PERFORMANCE` brief must not be spoken aloud.

## Listening Checklist

When reviewing the generated `.wav` files:

- Tags like `[whispers]`, `[laughs softly]`, `[giggles]`, `[gasps]`, `[sighs happily]`, `[drumroll]`, `[excited]`, and `[curious]` should shape delivery.
- Non-verbal tags should produce a vocal reaction or performance shift where possible, not a literal reading of the tag.
- Ambience tags like `[soft cafe ambience]`, `[rain outside]`, `[distant train chime]`, `[coins clinking]`, and `[gentle background music]` should be subtle and behind the voice if rendered.
- Background music should stay generic and non-lyrical.
- The tags themselves should not be spoken.
- The directed production sample should not read `PERFORMANCE`, `TRANSCRIPT`, or any prompt instructions aloud.
- Phrase and coach samples should remain clear enough for language practice.
- Accent and voice should roughly match the provided `options`.

## Prompt Contract

Inline tags belong in the transcript that is sent to TTS:

```text
[whispers] The library is quiet today. [curious] Can you find the blue book? [giggles] Careful, it squeaks.
```

They are silent performance cues. The app's prompt tells Gemini:

- Speak only the transcript.
- Treat square-bracket tags as delivery cues, not words.
- Treat non-verbal tags as vocal reactions when possible.
- Treat ambience/music tags as subtle background texture when possible.
- Apply each tag where it appears.
- Return to natural delivery unless another tag changes it.

Visible UI text should stay clean. Generated roleplay replies use `reply.text` for display and `reply.tts_text` for audio-only tags.

## Agent Voices

Scenario agents can define their own Gemini voice choices in `scenario.voice.voices`:

```ts
voice: {
  ageRange: "35-45",
  gender: "random",
  voices: { female: "Callirrhoe", male: "Algieba" },
  tone: "Warm, evocative sommelier.",
}
```

At runtime the app:

1. Resolves the character gender for the scenario.
2. Picks the matching scenario voice when one is configured.
3. Falls back to the global gender/default voice if the scenario has no voice override.

Invalid voice names are ignored and fall back to the default mapping.

## Smoke Test

Run the prompt contract test with Bun:

```bash
bun test lib/tts.test.ts
```

Or through package scripts:

```bash
bun run test
```

This does not call OpenRouter. It only verifies that `buildSpeechInput()` preserves tags in the transcript and places the tag guidance before the transcript.

## Notes

- This app currently targets Gemini TTS only.
- Gemini output is expected to be signed 16-bit little-endian PCM at 24 kHz, mono.
- The browser route returns WAV, not OGG/Opus.
- `tts.eval.ts` is intentionally SFW so samples are safe to keep around while tuning voice behavior.
