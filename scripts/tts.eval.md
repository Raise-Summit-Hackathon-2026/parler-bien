# TTS Evaluation Results

Generated: 2026-07-04T15:50:01.123Z

Model: `google/gemini-3.1-flash-tts-preview`

Audio saved to `tts-samples/`.

- `.pcm` is OpenRouter's raw Gemini output: signed 16-bit little-endian, 24 kHz, mono.
- `.wav` is the playable browser format produced by the same `pcmToWav()` helper used by the app.
- `.input.txt` is the exact prompt sent to OpenRouter, including the guarded `PERFORMANCE` block and transcript.

## Samples

### English library scene - whisper, curiosity, and giggle tags (en, character, voice: Sulafat)

- **Transcript**: `[whispers] The library is quiet today. [curious] Can you find the blue book on the top shelf? [giggles] Careful, it squeaks.`
- **Speech input**: `tts-samples/en-library-whisper-Sulafat.input.txt`
- **PCM**: `tts-samples/en-library-whisper-Sulafat.pcm` (339,840 bytes)
- **WAV**: `tts-samples/en-library-whisper-Sulafat.wav` (339,884 bytes)

### English travel scene - excited, gasp, and soft laugh tags (en, character, voice: Charon)

- **Transcript**: `[gasps] Platform seven! [excited] You found it! [laughs softly] Perfect, now we will catch the train on time.`
- **Speech input**: `tts-samples/en-train-excited-Charon.input.txt`
- **PCM**: `tts-samples/en-train-excited-Charon.pcm` (345,600 bytes)
- **WAV**: `tts-samples/en-train-excited-Charon.wav` (345,644 bytes)

### French phrase practice - slow gravity tag (fr, phrase, voice: Aoede)

- **Transcript**: `[slowly, with gravity] Le train part dans cinq minutes.`
- **Speech input**: `tts-samples/fr-slow-phrase-Aoede.input.txt`
- **PCM**: `tts-samples/fr-slow-phrase-Aoede.pcm` (165,120 bytes)
- **WAV**: `tts-samples/fr-slow-phrase-Aoede.wav` (165,164 bytes)

### English cafe tutor - ambience and gentle music (en, character, voice: Sulafat)

- **Transcript**: `[soft cafe ambience] Welcome in. [gentle background music] Today's tiny phrase is simple: I would like a coffee, please.`
- **Speech input**: `tts-samples/en-cafe-background-music-Sulafat.input.txt`
- **PCM**: `tts-samples/en-cafe-background-music-Sulafat.pcm` (339,840 bytes)
- **WAV**: `tts-samples/en-cafe-background-music-Sulafat.wav` (339,884 bytes)

### French rainy window - rain ambience and soft delivery (fr, character, voice: Sulafat)

- **Transcript**: `[rain outside] Écoute la pluie. [softly] Maintenant répète: je reste à la maison aujourd'hui.`
- **Speech input**: `tts-samples/fr-rainy-window-Sulafat.input.txt`
- **PCM**: `tts-samples/fr-rainy-window-Sulafat.pcm` (364,800 bytes)
- **WAV**: `tts-samples/fr-rainy-window-Sulafat.wav` (364,844 bytes)

### English magic trick - gasp, giggle, and big reveal (en, character, voice: Sulafat)

- **Transcript**: `[mysteriously] Watch the red card closely. [gasps] It vanished! [giggles] No, wait... it is behind your ear.`
- **Speech input**: `tts-samples/en-magic-trick-Sulafat.input.txt`
- **PCM**: `tts-samples/en-magic-trick-Sulafat.pcm` (574,080 bytes)
- **WAV**: `tts-samples/en-magic-trick-Sulafat.wav` (574,124 bytes)

### English quiz show - drumroll, suspense, and cheer (en, character, voice: Charon)

- **Transcript**: `[drumroll] The answer is... [dramatic pause] croissant! [cheers] You win today's pronunciation round.`
- **Speech input**: `tts-samples/en-quiz-drumroll-Charon.input.txt`
- **Error**: OpenRouter 400: {"error":{"message":"Provider returned 400","code":400}}

### English train station - distant chime and crowd ambience (en, character, voice: Charon)

- **Transcript**: `[distant train chime] The next train is arriving soon. [station ambience] Please practice this line with me: which platform is this?`
- **Speech input**: `tts-samples/en-platform-chime-Charon.input.txt`
- **PCM**: `tts-samples/en-platform-chime-Charon.pcm` (337,920 bytes)
- **WAV**: `tts-samples/en-platform-chime-Charon.wav` (337,964 bytes)

### French bakery scene - happy sigh and laugh (fr, character, voice: Sulafat)

- **Transcript**: `[sighs happily] Ça sent le pain chaud. [laughs softly] Impossible de résister, n'est-ce pas?`
- **Speech input**: `tts-samples/fr-bakery-happy-sigh-Sulafat.input.txt`
- **PCM**: `tts-samples/fr-bakery-happy-sigh-Sulafat.pcm` (268,800 bytes)
- **WAV**: `tts-samples/fr-bakery-happy-sigh-Sulafat.wav` (268,844 bytes)

### French coach - encouraging correction (fr, coach, voice: Sulafat)

- **Transcript**: `[encouragingly] Tres bien. Maintenant, arrondis un peu plus le son dans le mot bonjour.`
- **Speech input**: `tts-samples/fr-coach-encouraging-Sulafat.input.txt`
- **PCM**: `tts-samples/fr-coach-encouraging-Sulafat.pcm` (345,600 bytes)
- **WAV**: `tts-samples/fr-coach-encouraging-Sulafat.wav` (345,644 bytes)

### Spanish cafe scene - curious, hmm, and encouraging tags (es, character, voice: Sulafat)

- **Transcript**: `[curious] ¿Quieres practicar otra frase? [thinking hum] Mmm... [encouragingly] Vas muy bien.`
- **Speech input**: `tts-samples/es-cafe-curious-Sulafat.input.txt`
- **PCM**: `tts-samples/es-cafe-curious-Sulafat.pcm` (264,960 bytes)
- **WAV**: `tts-samples/es-cafe-curious-Sulafat.wav` (265,004 bytes)

### Spanish surprise scene - whisper, gasp, and cheer (es, character, voice: Sulafat)

- **Transcript**: `[whispers] Abre la puerta despacio. [gasps] ¡Sorpresa! [laughs] Practicaste perfecto.`
- **Speech input**: `tts-samples/es-surprise-party-Sulafat.input.txt`
- **PCM**: `tts-samples/es-surprise-party-Sulafat.pcm` (472,320 bytes)
- **WAV**: `tts-samples/es-surprise-party-Sulafat.wav` (472,364 bytes)

### Spanish market scene - crowd ambience and coins (es, character, voice: Charon)

- **Transcript**: `[lively market ambience] Buenos días. [coins clinking] Son tres euros, pero para practicar, repite conmigo: ¿cuánto cuesta?`
- **Speech input**: `tts-samples/es-market-coins-Charon.input.txt`
- **PCM**: `tts-samples/es-market-coins-Charon.pcm` (393,600 bytes)
- **WAV**: `tts-samples/es-market-coins-Charon.wav` (393,644 bytes)

### Production path - director brief must not be spoken (en, character, voice: Sulafat)

- **Transcript**: `Good morning. Welcome to the museum tour. Please follow me to the first gallery.`
- **Speech input**: `tts-samples/en-directed-prod-Sulafat.input.txt`
- **Error**: OpenRouter 400: {"error":{"message":"Provider returned 400","code":400}}

## Summary

- **Total samples**: 14
- **Successful**: 12
- **Errors**: 2

## Listening Checklist

- Bracket tags such as `[whispers]`, `[laughs softly]`, and `[excited]` should affect delivery but should not be spoken aloud.
- The directed production sample should not read the `PERFORMANCE` instructions or section labels.
- Phrase and coach samples should keep clear pronunciation for language practice.
