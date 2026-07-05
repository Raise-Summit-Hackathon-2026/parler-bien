# Character Unification — Design Spec

Date: 2026-07-04
Status: Approved by Fernando (pending spec review)

## Problem

The app has one product idea — talk to an AI character that trains you by voice —
implemented under three overlapping vocabularies:

- `Scenario` (`lib/scenarios.ts`, 10 hardcoded built-ins + the runtime shape
  `PracticeSession` consumes)
- `VoiceAgent` (`lib/agents.ts`, Captain Eva only, carries voice/delivery/coaching
  style and `personaBase`)
- `FreePlayExperience` (`lib/free-play-experiences.ts`, the multi-level cabin-crew
  demo, converted back into `Scenario` at runtime via `buildExperienceLevelScenario`)

plus a DB envelope `CharacterRow` that wraps a `Scenario` as jsonb. Four play
routes exist for what the user perceives as one action. The generate API still
speaks of "tracks" (a deleted concept), `AgentType` has `language`/`spiritual`
values no live path uses, and the home page shows "Featured agent", "Scenarios",
and "Create your own character" side by side.

## Decisions (made with Fernando)

1. **Unify everything around `Character`, with optional multi-level paths.**
   Gesture levels stay, as a level type — not a parallel engine.
2. **Free Play is curated by category** to showcase range (languages,
   professional, sports, everyday). Categories are first-class in the
   domain model, not a string tag on a flat list.
3. **No deadline — one coherent refactor**, model first, UX on top.

## 1. Identity & story

One sentence used in README, `<title>`, and the home hero:

> **Talk your way to any skill — voice-first training with AI characters, from
> languages to leadership.**

The home page tells one story in three beats:

1. **Hero** — what it is.
2. **Free Play** — try it now: curated example characters grouped by category.
3. **Workspaces** — make it yours: "these were built with the same engine —
   generate and share your own characters with your team."

## 2. Domain model

Category is the organizing axis. Built-in content lives per category, and the
UI renders categories, not a flat list.

```ts
// lib/character.ts (types) — the ONE model
type CharacterCategoryId =
  | "languages" | "professional" | "sports" | "everyday"

type CharacterCategory = {
  id: CharacterCategoryId
  label: string          // e.g. "Professional"
  tagline: string        // one line under the row heading
}

type Character = {
  id: string             // built-in slug or DB uuid
  name: string
  tagline: string
  category: CharacterCategoryId
  avatarPrompt: string   // for /api/image
  voice: { ageRange: string; tone: string }
  deliveryStyle?: string // absorbed from VoiceAgent
  coachingStyle?: string // absorbed from VoiceAgent
  persona: string        // base system prompt
  featured?: boolean     // bigger card in its category row
  levels: Level[]        // 1..n — a "classic scenario" is 1 voice level
}

type Level = VoiceLevel | GestureLevel

type VoiceLevel = {
  kind: "voice"
  title: string
  goal?: string
  meter?: { label: string; start: number }   // as today
  winMessage?: string
  personaOverlay?: string  // appended to Character.persona for this level
  mode?: "roleplay" | "coach" | "open"
                           // roleplay (default): goal + meter
                           // coach: pronunciation drilling (teacher), no meter
                           // open: free conversation, no scoring (Siddhartha)
  content?: Partial<Record<LanguageId, ScenarioContent>>
                           // per-language opening line + starters — preserves
                           // the en/es/ru translations built-ins carry today
}

type GestureLevel = {
  kind: "gesture"
  title: string
  steps: GestureStep[]     // from lib/gestures.ts, unchanged
}
```

```ts
// lib/characters/ — built-in content, one file per category
lib/characters/index.ts        // CATEGORIES + BUILT_IN_CHARACTERS assembly, lookups
lib/characters/languages.ts    // teacher, boulanger, sommelier, taxi, ...
lib/characters/professional.ts // captain-eva (3 levels), job-interview (new)
lib/characters/sports.ts       // sports coach (new)
lib/characters/everyday.ts     // vendor, parisian, waiter, landlord, ...
```

Mappings from today's code:

- `Scenario` → `Character` with one `VoiceLevel`. Field-for-field: persona,
  voice, goal/meter/winMessage, per-language content, sentences.
- `VoiceAgent` fields (`personaBase`, `deliveryStyle`, `coachingStyle`, `voice`,
  avatar) → fold into the Character that used them (Eva).
- `FreePlayExperience` "cabin-crew" → built-in Character `captain-eva` with 3
  levels (voice → gesture → voice); `customPersonaOverlay` → `personaOverlay`.
- `AgentType` (`language`/`roleplay`/`spiritual`) and `AgentCapability` →
  deleted. "Spiritual" becomes `openEnded: true` + coaching category. "Teacher"
  scoring behavior becomes per-character prompt config, not an id special case
  (removes the `scenario.id === "teacher"` legacy seam in `/api/score`).

Deleted after migration: `lib/agents.ts`, `lib/free-play-experiences.ts`,
`buildExperienceLevelScenario`, `experienceLevelRoom`, `getExperienceAgent`,
`nextExperienceLevelLabel`, `AGENT_CAPABILITY_OPTIONS`, `lib/scenarios.ts`
(content moves to `lib/characters/`; any shared runtime helpers move to
`lib/character.ts`).

## 3. Persistence

**Constraint: no backend access — zero Supabase changes.** No migrations, no
schema edits, no RLS changes. The workspace model stays exactly as deployed:
`user_workspaces`, `workspace_members`, `workspace_share_links`, `characters`
table, RLS, share tokens.

- The `characters.scenario` jsonb column keeps its name and now stores the
  `Character` shape (jsonb is schemaless; no migration required).
- A read-mapper (`lib/character-compat.ts`) detects old-shape rows (a `Scenario`
  jsonb, no `levels` array) and maps them to `Character` with one VoiceLevel on
  read. Writes always use the new shape. (Hackathon-era data; mapper is small
  and can be removed later.)
- Personal characters: `workspace_id IS NULL`, unchanged.

## 4. Routes & engine

**One play route: `/play/[characterId]`.**

- Resolves built-in slug → `BUILT_IN_CHARACTERS`, else uuid → `getCharacter`
  (RLS already enforces workspace access).
- `?from=workspace:{id}` sets the back button; default back is `/#free-play`.
- Replaces and deletes: `/play/[scenarioId]`, `/play/character/[characterId]`,
  `/play/experience/[experienceId]`,
  `/workspaces/[workspaceId]/play/[characterId]`.

**Engine components:**

- `CharacterSession` (new, thin): walks `character.levels[]`, renders
  `PracticeSession` for voice levels and `GestureSession` for gesture levels,
  owns the level strip and continue flow. Single-level characters render with
  no strip — indistinguishable from today's scenario play.
- `PracticeSession` split while touched (751 lines today):
  - `useConversation` hook — record → `/api/score` → meter/history → `/api/tts`
    loop.
  - `SessionHUD` — meter, transcript, word scores, coaching display.
  - `PracticeSession` keeps composition + level-specific chrome.
  - The `experienceAgent` / `experienceMeta` / `onExperienceContinue` optional
    props are removed; it always receives `(character, voiceLevel)`.
- `GestureSession` / `useGestureCamera` / `lib/gestures.ts`: unchanged
  internals; consume `GestureLevel`.
- Prompt building (`lib/prompts/`): keyed off the level's `mode`
  (roleplay/coach/open) plus `coachingStyle`/overlay, instead of agent type or
  scenario id. `spiritual.ts` becomes the `open` mode prompt; `language.ts`
  becomes `coach`; Siddhartha/teacher are just characters using those modes.
- `/api/score` contract unchanged (`PronunciationScore`); only its prompt
  assembly input changes. `/api/tts`, `/api/image` unchanged.

## 5. Generation

- `/api/scenario/generate` → `/api/character/generate`. Emits a `Character`
  (1..n voice levels; gesture levels are never generated). All "track"
  vocabulary (`trackCount`, "distinct practice tracks") removed — the batch
  param becomes `characterCount`.
- `lib/scenario-generate-schema.ts` → `lib/character-generate-schema.ts`,
  emitting the Character shape.
- `CustomScenarioBuilder` → `CharacterBuilder` (`components/character-builder.tsx`),
  same UX, saves a `Character` via `saveCharacter`.
- Content safety flow unchanged.

## 6. Home page & naming

- `app/page.tsx`: `HomeHero` → `FreePlaySection` → `WorkspacesCta` (reframed
  copy: "build your own").
- `FreePlaySection` renders **category rows** from `CATEGORIES` ×
  `BUILT_IN_CHARACTERS` + the user's personal characters (own row: "Yours"),
  ending with the create card. `featured` characters get the large card with a
  level badge ("3 levels · Voice · Camera").
- Deleted/renamed components:
  - `FeaturedExperiencePicker`, `ScenarioPicker`, `ExperienceLevelStrip` (strip
    logic moves into `CharacterSession`) — deleted.
  - `track-catalogue.tsx` → `home-hero.tsx` (`HomeHero`, `WorkspacesCta`).
  - `CharacterGrid` becomes category-aware (renders one row/section per
    category).
- Header: Home / Free Play / Workspaces + `SettingsMenu` + `AuthStatus` (as
  now). Hero keeps its two CTAs; no third duplicate link.
- New content: **Sports coach** (halftime talk, meter = team morale) and
  **Job interview** (professional). Both single-level voice characters.
- README + `layout.tsx` title rewritten to the one-liner; stale
  `Raise-Hack` clone instructions fixed.

## 7. Sequencing & verification

Model-first, each step ends with `tsc --noEmit` clean and the TTS tests
(`bun test`) passing:

1. **Types + content**: `lib/character.ts`, `lib/characters/` (map all
   existing scenarios/agent/experience content over). Old code untouched.
2. **Engine**: prompts + `useConversation`/`SessionHUD`/`PracticeSession`/
   `CharacterSession` consume `Character`/`Level`.
3. **Route**: `/play/[characterId]`; delete the four old play routes and
   converters; delete `agents.ts`, `free-play-experiences.ts`, `scenarios.ts`.
4. **Persistence**: read-mapper for old-shape rows (no DB changes); builder/
   generate save the new shape into the existing `scenario` jsonb column.
5. **UX**: category rows, home copy, renames, nav cleanup.
6. **Content**: sports coach + job interview characters.
7. **Sweep**: dead files, README, `AGENTS.md` check.

Manual smoke after steps 3, 4, 5: (a) play a built-in character, (b) play
Captain Eva through all 3 levels incl. camera, (c) create + play a custom
character, (d) workspace: create, invite via share link, play a workspace
character.

Rollback safety: every deletion is recoverable from git; the database is never
touched (compat handled entirely in the read-mapper).

## Out of scope

- Generating gesture levels.
- Progress tracking / completion persistence beyond what exists.
- Auth changes, TTS/scoring engine changes, image pipeline changes.
