<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Single service: a Next.js 16 app ("Parler Bien", a spoken-language pronunciation coach). Commands live in `package.json` scripts.
- Package manager is **bun** (see `bun.lock`), and `bun test` is the test runner (tests use `bun:test`). Use `bun install` / `bun run <script>`; do not use npm even though `package-lock.json` is present. `bun` is preinstalled on the VM (symlinked at `/usr/local/bin/bun`); the startup update script runs `bun install`.
- Run: `bun run dev` (Next dev server on http://localhost:3000). Lint: `bun run lint`. Types: `bun run typecheck`. Tests: `bun run test`.
- AI features (pronunciation scoring `/api/score`, TTS `/api/tts`, scenario image `/api/image`, custom scenario generation `/api/scenario/generate`) call OpenRouter directly and require the `OPENROUTER_API_KEY` env var. Without it those routes return HTTP 500 `"OPENROUTER_API_KEY is not configured"`, but the client UI (scenario picker → practice session) still renders and navigates fine.
- The `/api/score` and `/api/tts` flows need microphone-recorded audio, so they cannot be fully exercised headlessly; verify them via the API with a supplied audio sample or in a browser with mic access.
- Optional env: `CONTENT_SAFETY_ENABLED=false` disables the moderation pass in `/api/score`; `NEXT_PUBLIC_APP_URL` sets the OpenRouter `HTTP-Referer`.
- TTS and image routes keep an in-memory cache in the route module, so cached responses reset on server restart / hot reload.
