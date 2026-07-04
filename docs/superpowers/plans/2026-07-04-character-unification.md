# Character Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify Scenario / VoiceAgent / FreePlayExperience into one `Character` domain model (categories first-class, optional multi-level voice/gesture levels), one play route `/play/[characterId]`, and a category-row Free Play home page.

**Architecture:** `Character` is the domain model; the existing `Scenario` shape survives only as the wire/runtime payload for `/api/score` (extended with `mode`, `deliveryStyle`, `coachingStyle`), produced by ONE converter `characterLevelScenario()`. Built-in content lives in `lib/characters/<category>.ts`. DB is untouched: the `characters.scenario` jsonb column now stores the `Character` shape; a read-mapper upgrades old rows.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Bun (`bun test`, `bunx tsc`), Supabase JS client (browser reads/writes, RLS), OpenRouter (Gemini).

**Spec:** `docs/superpowers/specs/2026-07-04-character-unification-design.md` — read it first.

## Global Constraints

- **ZERO Supabase/backend changes.** No migrations, no schema edits, no RLS changes, no new tables/columns. The `characters.scenario` jsonb column keeps its name.
- `/api/score` **response** contract (`PronunciationScore`) unchanged. `/api/tts`, `/api/image` untouched.
- After EVERY task: `bunx tsc --noEmit` exits 0 AND `bun test` passes (the existing `lib/tts.test.ts` suite plus tests added here).
- Package manager / runner is **bun** (`bun test`, `bunx tsc --noEmit`). Run all commands from the repo root `/Users/leyra/Developer/09_Hackathon/03_Parlez-moi/parler-bien`.
- Copy rule: the product one-liner everywhere is **"Talk your way to any skill — voice-first training with AI characters, from languages to leadership."**
- Category ids are exactly: `languages`, `professional`, `coaching`, `sports`, `everyday`.
- Commit after every task (small, described commits). Do not push.

---

### Task 0: Baseline commit

The working tree has untracked experience/gesture files and uncommitted edits that ARE the current product. Lock them in so every later diff is reviewable.

**Files:**
- No code changes. `git add` everything currently modified/untracked.

- [ ] **Step 1: Verify clean type-check on the current tree**

Run: `bunx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 2: Commit the working tree as the baseline**

```bash
git add -A
git commit -m "chore: baseline — experience/gesture free-play state before character unification"
```

- [ ] **Step 3: Verify nothing is left dirty**

Run: `git status --short`
Expected: empty output.

---

### Task 1: `lib/character.ts` — domain types + the one converter

**Files:**
- Create: `lib/character.ts`
- Test: `lib/character.test.ts`

**Interfaces:**
- Consumes: `Scenario`, `ScenarioContent` types from `@/lib/scenarios` (moved into this file in Task 10); `GestureStep` from `@/lib/gestures`; `LanguageId` from `@/lib/languages`; `SentenceSuggestion` from `@/lib/types`.
- Produces (every later task relies on these exact names):
  - types `CharacterCategoryId`, `CharacterCategory`, `Character`, `Level`, `VoiceLevel`, `GestureLevel`, `VoiceLevelMode`
  - const `CATEGORIES: CharacterCategory[]`
  - `characterLevelScenario(character: Character, levelIndex: number, languageId: LanguageId): Scenario`
  - `scenarioToCharacter(scenario: Scenario, id: string, category?: CharacterCategoryId): Character`
  - `levelBadge(character: Character): string | null` (e.g. `"3 levels · Voice · Camera"`, `null` for single-level)

- [ ] **Step 1: Write the failing test**

```ts
// lib/character.test.ts
import { describe, expect, test } from "bun:test"

import {
  CATEGORIES,
  characterLevelScenario,
  levelBadge,
  scenarioToCharacter,
  type Character,
} from "@/lib/character"
import type { Scenario } from "@/lib/scenarios"

const sampleCharacter: Character = {
  id: "test-char",
  name: "Test Char",
  tagline: "A test",
  category: "professional",
  avatarPrompt: "portrait",
  voice: { ageRange: "30-40", tone: "calm" },
  deliveryStyle: "steady",
  coachingStyle: "kind",
  persona: "BASE PERSONA",
  levels: [
    {
      kind: "voice",
      id: "l1",
      title: "Level one",
      subtitle: "First",
      mode: "roleplay",
      goal: "Win",
      meterLabel: "Trust",
      winMessage: "Done",
      personaOverlay: "OVERLAY",
      content: {
        openingLine: { text: "Bonjour", hint: "Hello" },
        starters: [{ text: "Salut", hint: "Hi" }],
      },
    },
    {
      kind: "gesture",
      id: "l2",
      title: "Gesture level",
      subtitle: "Second",
      steps: [],
      winMessage: "Nice",
    },
  ],
}

describe("characterLevelScenario", () => {
  test("builds a wire Scenario from a voice level", () => {
    const scenario = characterLevelScenario(sampleCharacter, 0, "fr")
    expect(scenario.id).toBe("custom:test-char-l1")
    expect(scenario.title).toBe("Level one")
    expect(scenario.persona).toBe("BASE PERSONA\n\nOVERLAY")
    expect(scenario.goal).toBe("Win")
    expect(scenario.meterLabel).toBe("Trust")
    expect(scenario.mode).toBe("roleplay")
    expect(scenario.deliveryStyle).toBe("steady")
    expect(scenario.coachingStyle).toBe("kind")
    expect(scenario.content.fr?.openingLine?.text).toBe("Bonjour")
    expect(scenario.primaryLanguageId).toBe("fr")
  })

  test("omits overlay when absent and throws on gesture levels", () => {
    const noOverlay: Character = {
      ...sampleCharacter,
      levels: [{ ...sampleCharacter.levels[0], personaOverlay: undefined } as never],
    }
    expect(characterLevelScenario(noOverlay, 0, "fr").persona).toBe("BASE PERSONA")
    expect(() => characterLevelScenario(sampleCharacter, 1, "fr")).toThrow()
  })
})

describe("scenarioToCharacter", () => {
  test("wraps a legacy Scenario as a single-voice-level Character", () => {
    const legacy: Scenario = {
      id: "custom:abc",
      title: "The Clerk",
      tagline: "Check in",
      goal: "Get a room",
      meterLabel: "Patience",
      winMessage: "Booked!",
      persona: "You are a clerk",
      voice: { ageRange: "40-50", tone: "brisk" },
      content: { fr: { openingLine: { text: "Oui?", hint: "Yes?" }, starters: [] } },
      imagePrompt: "hotel desk",
      primaryLanguageId: "fr",
    }
    const character = scenarioToCharacter(legacy, "row-uuid")
    expect(character.id).toBe("row-uuid")
    expect(character.name).toBe("The Clerk")
    expect(character.category).toBe("everyday")
    expect(character.levels).toHaveLength(1)
    const level = character.levels[0]
    expect(level.kind).toBe("voice")
    if (level.kind === "voice") {
      expect(level.goal).toBe("Get a room")
      expect(level.content?.openingLine?.text).toBe("Oui?")
    }
    // round-trip: converting back yields the same persona/goal
    const back = characterLevelScenario(character, 0, "fr")
    expect(back.persona).toBe("You are a clerk")
    expect(back.goal).toBe("Get a room")
  })
})

describe("categories & badges", () => {
  test("CATEGORIES has the five spec ids in order", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      "languages",
      "professional",
      "coaching",
      "sports",
      "everyday",
    ])
  })

  test("levelBadge summarizes multi-level characters", () => {
    expect(levelBadge(sampleCharacter)).toBe("2 levels · Voice · Camera")
    const single = scenarioToCharacter(
      characterLevelScenario(sampleCharacter, 0, "fr"),
      "x",
    )
    expect(levelBadge(single)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/character.test.ts`
Expected: FAIL — `Cannot find module '@/lib/character'`.

- [ ] **Step 3: Implement `lib/character.ts`**

```ts
// lib/character.ts
import type { GestureStep } from "@/lib/gestures"
import type { LanguageId } from "@/lib/languages"
import type { Scenario, ScenarioContent } from "@/lib/scenarios"

export type CharacterCategoryId =
  | "languages"
  | "professional"
  | "coaching"
  | "sports"
  | "everyday"

export type CharacterCategory = {
  id: CharacterCategoryId
  label: string
  tagline: string
}

export const CATEGORIES: CharacterCategory[] = [
  {
    id: "languages",
    label: "Languages",
    tagline: "Order, haggle, and chat with native-speaking locals.",
  },
  {
    id: "professional",
    label: "Professional",
    tagline: "Job skills, service under pressure, interviews.",
  },
  {
    id: "coaching",
    label: "Coaching & Reflection",
    tagline: "Open conversations that help you think out loud.",
  },
  {
    id: "sports",
    label: "Sports",
    tagline: "Lead a team, rally a locker room, coach out loud.",
  },
  {
    id: "everyday",
    label: "Everyday Life",
    tagline: "Real situations you'll actually run into.",
  },
]

export type VoiceLevelMode = "roleplay" | "coach" | "open"

export type VoiceLevel = {
  kind: "voice"
  id: string
  title: string
  subtitle: string
  /** roleplay (default): goal + meter. coach: pronunciation drilling, no meter. open: free conversation, no scoring. */
  mode?: VoiceLevelMode
  goal?: string
  meterLabel?: string
  winMessage?: string
  /** Appended to Character.persona for this level */
  personaOverlay?: string
  content?: ScenarioContent
}

export type GestureLevel = {
  kind: "gesture"
  id: string
  title: string
  subtitle: string
  steps: GestureStep[]
  winMessage: string
  holdMs?: number
}

export type Level = VoiceLevel | GestureLevel

export type Character = {
  /** Built-in slug (e.g. "captain-eva") or DB row uuid */
  id: string
  name: string
  tagline: string
  category: CharacterCategoryId
  avatarPrompt: string
  voice: Scenario["voice"]
  deliveryStyle?: string
  coachingStyle?: string
  persona: string
  featured?: boolean
  /** Set on AI-generated characters */
  primaryLanguageId?: LanguageId
  sourceLabel?: string
  levels: Level[]
}

export function characterLevelScenario(
  character: Character,
  levelIndex: number,
  languageId: LanguageId,
): Scenario {
  const level = character.levels[levelIndex]
  if (!level || level.kind !== "voice") {
    throw new Error(`Level ${levelIndex} of ${character.id} is not a voice level`)
  }

  const persona = level.personaOverlay
    ? `${character.persona}\n\n${level.personaOverlay}`
    : character.persona

  return {
    id: `custom:${character.id}-${level.id}`,
    title: level.title,
    tagline: level.subtitle,
    goal: level.goal ?? null,
    meterLabel: level.meterLabel ?? null,
    winMessage: level.winMessage ?? null,
    persona,
    voice: character.voice,
    mode: level.mode ?? "roleplay",
    deliveryStyle: character.deliveryStyle,
    coachingStyle: character.coachingStyle,
    content: level.content
      ? { [languageId]: level.content }
      : {},
    imagePrompt: character.avatarPrompt,
    primaryLanguageId: character.primaryLanguageId ?? languageId,
    sourceLabel: character.sourceLabel,
  }
}

export function scenarioToCharacter(
  scenario: Scenario,
  id: string,
  category: CharacterCategoryId = "everyday",
): Character {
  const contents = Object.entries(scenario.content)
  const primary =
    (scenario.primaryLanguageId &&
      scenario.content[scenario.primaryLanguageId]) ||
    contents[0]?.[1]

  return {
    id,
    name: scenario.title,
    tagline: scenario.tagline,
    category,
    avatarPrompt: scenario.imagePrompt,
    voice: scenario.voice,
    deliveryStyle: scenario.deliveryStyle,
    coachingStyle: scenario.coachingStyle,
    persona: scenario.persona,
    primaryLanguageId: scenario.primaryLanguageId,
    sourceLabel: scenario.sourceLabel,
    levels: [
      {
        kind: "voice",
        id: "main",
        title: scenario.title,
        subtitle: scenario.tagline,
        mode: scenario.mode ?? "roleplay",
        goal: scenario.goal ?? undefined,
        meterLabel: scenario.meterLabel ?? undefined,
        winMessage: scenario.winMessage ?? undefined,
        content: primary ?? undefined,
      },
    ],
  }
}

export function levelBadge(character: Character): string | null {
  if (character.levels.length <= 1) return null
  const kinds: string[] = []
  if (character.levels.some((l) => l.kind === "voice")) kinds.push("Voice")
  if (character.levels.some((l) => l.kind === "gesture")) kinds.push("Camera")
  return `${character.levels.length} levels · ${kinds.join(" · ")}`
}
```

- [ ] **Step 4: Extend the wire `Scenario` type**

In `lib/scenarios.ts`, add three optional fields to `export type Scenario` (after `voice`, before `content` at `lib/scenarios.ts:36`):

```ts
  /** Prompt mode carried from the Character's voice level. Default "roleplay". */
  mode?: "roleplay" | "coach" | "open"
  deliveryStyle?: string
  coachingStyle?: string
```

- [ ] **Step 5: Run tests and type-check**

Run: `bun test lib/character.test.ts && bunx tsc --noEmit`
Expected: all tests PASS; tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/character.ts lib/character.test.ts lib/scenarios.ts
git commit -m "feat: Character domain model, categories, and the one Scenario converter"
```

---

### Task 2: Built-in content — `lib/characters/` (one file per category)

**Files:**
- Create: `lib/characters/languages.ts`, `lib/characters/professional.ts`, `lib/characters/coaching.ts`, `lib/characters/sports.ts`, `lib/characters/everyday.ts`, `lib/characters/index.ts`
- Reference (content sources, do NOT delete yet): `lib/scenarios.ts:145-690` (SCENARIOS), `lib/agents.ts:49-91` (Captain Eva), `lib/free-play-experiences.ts:50-132` (cabin-crew levels), `lib/prompts/spiritual.ts` (tone reference for Siddhartha)
- Test: extend `lib/character.test.ts`

NOTE: `lib/characters.ts` (the Supabase client module) and the new `lib/characters/` directory coexist — TypeScript resolves `@/lib/characters` to the FILE `lib/characters.ts`, so the index must always be imported as `@/lib/characters/index`. To avoid that footgun, Task 3 renames the client module; in THIS task import the category files directly in `index.ts` via relative paths and name the barrel export explicitly.

**Interfaces:**
- Consumes: `Character`, `CharacterCategoryId` from `@/lib/character`; `CABIN_SAFETY_GESTURES` from `@/lib/gestures`.
- Produces:
  - `BUILT_IN_CHARACTERS: Character[]` (from `@/lib/characters/index`)
  - `isBuiltInCharacterId(value: string): boolean`
  - `getBuiltInCharacter(id: string): Character` (throws on unknown)
  - `builtInCharactersByCategory(category: CharacterCategoryId): Character[]`

- [ ] **Step 1: Write the failing test (append to `lib/character.test.ts`)**

```ts
import {
  BUILT_IN_CHARACTERS,
  builtInCharactersByCategory,
  getBuiltInCharacter,
  isBuiltInCharacterId,
} from "@/lib/characters/index"

describe("built-in characters", () => {
  test("every category has at least one character", () => {
    for (const cat of CATEGORIES) {
      expect(builtInCharactersByCategory(cat.id).length).toBeGreaterThan(0)
    }
  })

  test("ids are unique and resolvable", () => {
    const ids = BUILT_IN_CHARACTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(isBuiltInCharacterId(id)).toBe(true)
      expect(getBuiltInCharacter(id).id).toBe(id)
    }
    expect(isBuiltInCharacterId("nope")).toBe(false)
  })

  test("captain-eva is featured, 3 levels, voice-gesture-voice", () => {
    const eva = getBuiltInCharacter("captain-eva")
    expect(eva.featured).toBe(true)
    expect(eva.category).toBe("professional")
    expect(eva.levels.map((l) => l.kind)).toEqual(["voice", "gesture", "voice"])
  })

  test("siddhartha is open mode, teacher is coach mode", () => {
    const sidd = getBuiltInCharacter("siddhartha")
    expect(sidd.category).toBe("coaching")
    expect(sidd.levels[0]?.kind).toBe("voice")
    if (sidd.levels[0]?.kind === "voice") expect(sidd.levels[0].mode).toBe("open")
    const teacher = getBuiltInCharacter("teacher")
    if (teacher.levels[0]?.kind === "voice") expect(teacher.levels[0].mode).toBe("coach")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/character.test.ts`
Expected: FAIL — `Cannot find module '@/lib/characters/index'`.

- [ ] **Step 3: Create the category files by MOVING existing content verbatim**

Mapping (copy each scenario object's persona/voice/content/imagePrompt fields **verbatim** from `lib/scenarios.ts` into a `Character` literal; title→name, tagline→tagline, the goal/meterLabel/winMessage/content go into a single `VoiceLevel` with `id: "main"`, `title` = name, `subtitle` = tagline):

| Source (`SCENARIOS` id) | Target file | Character id | category | mode |
|---|---|---|---|---|
| `teacher` | `languages.ts` | `teacher` | languages | `coach` |
| `boulanger` | `languages.ts` | `boulanger` | languages | roleplay |
| `sommelier` | `languages.ts` | `sommelier` | languages | roleplay |
| `taxi` | `languages.ts` | `taxi` | languages | roleplay |
| `vendor` | `everyday.ts` | `vendor` | everyday | roleplay |
| `parisian` | `everyday.ts` | `parisian` | everyday | roleplay |
| `waiter` | `everyday.ts` | `waiter` | everyday | roleplay |
| `landlord` | `everyday.ts` | `landlord` | everyday | roleplay |

Multi-language content: the old `Scenario.content` is `Partial<Record<LanguageId, ScenarioContent>>` but `VoiceLevel.content` is a single `ScenarioContent`. For built-ins whose per-language content is identical/empty (all except any with real translations — check each), take the `fr` entry. If a scenario has REAL differing per-language content, keep the fr version and note the loss in the commit message (the score prompt already localizes via `formatPersona`).

Shape template for each migrated character:

```ts
// lib/characters/everyday.ts
import type { Character } from "@/lib/character"

export const EVERYDAY_CHARACTERS: Character[] = [
  {
    id: "vendor",
    name: "The Market Vendor",
    tagline: "Haggle at the flea market. Get the lamp under 20.",
    category: "everyday",
    avatarPrompt: /* verbatim imagePrompt from scenarios.ts */ "",
    voice: /* verbatim voice object */ { ageRange: "", tone: "" },
    persona: /* verbatim persona */ "",
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Market Vendor",
        subtitle: "Haggle at the flea market. Get the lamp under 20.",
        goal: "Get the vintage lamp for under 20 (euros or dollars)",
        meterLabel: "Deal likelihood",
        winMessage: "Deal! You talked them down.",
        content: /* verbatim fr ScenarioContent */ { openingLine: null, starters: [] },
      },
    ],
  },
  // parisian, waiter, landlord — same treatment
]
```

**`professional.ts`** — Captain Eva assembled from `lib/agents.ts` (persona/voice/delivery/coaching/avatar, all verbatim) + the three cabin-crew levels from `lib/free-play-experiences.ts:60-130` (verbatim: openingLine/starters go into `content`, `customPersonaOverlay`→`personaOverlay`, `subtitle` stays, gesture level keeps `steps: CABIN_SAFETY_GESTURES`, `holdMs: 1400`):

```ts
// lib/characters/professional.ts
import type { Character } from "@/lib/character"
import { CABIN_SAFETY_GESTURES } from "@/lib/gestures"

export const PROFESSIONAL_CHARACTERS: Character[] = [
  {
    id: "captain-eva",
    name: "Captain Eva",
    tagline: "Lead cabin crew on flight 959 — welcome, safety demo, calm 23B",
    category: "professional",
    featured: true,
    avatarPrompt:
      "Professional female flight attendant in navy uniform, airplane cabin interior, confident welcoming smile, cinematic lighting",
    voice: {
      ageRange: "30-40",
      tone: "crisp cabin PA voice that drops to a calm whisper under pressure",
    },
    deliveryStyle: /* verbatim from lib/agents.ts AGENTS[0].deliveryStyle */ "",
    coachingStyle: /* verbatim from lib/agents.ts AGENTS[0].coachingStyle */ "",
    persona: /* verbatim from lib/agents.ts AGENTS[0].personaBase */ "",
    levels: [
      /* voice level cabin-l1-welcome — verbatim fields from free-play-experiences.ts */
      /* gesture level cabin-l2-safety — steps: CABIN_SAFETY_GESTURES, holdMs: 1400 */
      /* voice level cabin-l3-nervous — verbatim */
    ],
  },
  {
    id: "job-interview",
    name: "The Interviewer",
    tagline: "A tough-but-fair hiring manager. Land the offer.",
    category: "professional",
    avatarPrompt:
      "Sharp hiring manager across a minimal desk, modern office, neutral expression with attentive eyes, cinematic illustration, no text, no logos",
    voice: { ageRange: "40-50", tone: "measured, professional, probing — warms up when impressed" },
    persona: `You are a hiring manager interviewing the user for a role they care about. You are {characterGender} and approximately 40-50 years old. Ask one question at a time: experience, motivation, a behavioral question, salary expectations. Vague or rambling answers lower your confidence; concrete, structured, confident answers raise it. Track hiring confidence on a meter from 0-100. Start around 20. At 90+ you decide to make an offer and say so. Speak in short lines (1-2 sentences). Stay in character. Never use quotation marks around what they should say.`,
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Interviewer",
        subtitle: "A tough-but-fair hiring manager. Land the offer.",
        goal: "Convince the interviewer to make you an offer",
        meterLabel: "Hiring confidence",
        winMessage: "They're reaching for the offer letter. You nailed it.",
        content: {
          openingLine: {
            text: "Thanks for coming in. So — tell me a little about yourself, and why this role?",
            hint: "Open with a confident, structured intro",
          },
          starters: [
            { text: "Thank you for having me. I've spent the last three years leading...", hint: "Structured self-intro" },
            { text: "What drew me here is the team's focus on...", hint: "Motivation, specific" },
            { text: "Could you tell me what success looks like in the first six months?", hint: "Turn it around thoughtfully" },
          ],
        },
      },
    ],
  },
]
```

**`coaching.ts`** — Siddhartha, `mode: "open"` (tone modeled on `lib/prompts/spiritual.ts`):

```ts
// lib/characters/coaching.ts
import type { Character } from "@/lib/character"

export const COACHING_CHARACTERS: Character[] = [
  {
    id: "siddhartha",
    name: "Siddhartha",
    tagline: "An open conversation to untangle whatever is on your mind.",
    category: "coaching",
    avatarPrompt:
      "Serene figure seated beneath a bodhi tree at dawn, soft golden light, misty river valley, peaceful expression, cinematic illustration, no text, no logos",
    voice: { ageRange: "50-60", tone: "slow, warm, unhurried — long pauses, gentle curiosity" },
    persona: `You are Siddhartha, a calm reflective guide. The user talks through whatever is on their mind — a decision, a worry, a goal. You listen deeply and answer in under 3 sentences, always ending with one gentle question that helps them see their own thinking. Never lecture, never give lists, never rush. Stay in character.`,
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "Siddhartha",
        subtitle: "An open conversation to untangle whatever is on your mind.",
        mode: "open",
        content: {
          openingLine: {
            text: "Sit with me a moment. What is occupying your mind today?",
            hint: "Just start talking — there's no wrong answer",
          },
          starters: [
            { text: "I've been going back and forth on a decision...", hint: "Bring a real dilemma" },
            { text: "Lately I feel busy but not productive.", hint: "Name a feeling" },
            { text: "I want to talk through a goal I keep postponing.", hint: "Surface a stuck goal" },
          ],
        },
      },
    ],
  },
]
```

**`sports.ts`** — the halftime coach:

```ts
// lib/characters/sports.ts
import type { Character } from "@/lib/character"

export const SPORTS_CHARACTERS: Character[] = [
  {
    id: "halftime-coach",
    name: "The Halftime Talk",
    tagline: "Your team is down at the break. Lift the locker room.",
    category: "sports",
    avatarPrompt:
      "Locker room at halftime, tired players on benches looking up, tactical board in background, dramatic side lighting, cinematic illustration, no text, no logos",
    voice: { ageRange: "25-35", tone: "a weary team captain — flat at first, catches fire when inspired" },
    persona: `You are the captain of a team losing 0-2 at halftime. The user is the coach giving the halftime talk. You are {characterGender} and approximately 25-35 years old. You respond as the voice of the locker room: skeptical and deflated at first. Empty clichés or blame lower morale; specific tactical points, belief, and personal call-outs raise it. Track team morale on a meter from 0-100. Start around 15. At 90+ the room is on its feet and you say the team is ready to run through a wall. Speak in short lines (1-2 sentences). Stay in character. Never use quotation marks around what they should say.`,
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Halftime Talk",
        subtitle: "Your team is down at the break. Lift the locker room.",
        goal: "Get team morale to the top before the second half",
        meterLabel: "Team morale",
        winMessage: "The room erupts. They'd run through a wall for you.",
        content: {
          openingLine: {
            text: "Coach... we're down two. Nothing's working out there. What do you want from us?",
            hint: "The room is waiting — set the tone",
          },
          starters: [
            { text: "Heads up, all of you. That half is gone — the next one is ours.", hint: "Reset the energy" },
            { text: "We're losing every second ball. That changes now, starting with midfield.", hint: "Specific tactical point" },
            { text: "Marco, you've won us games before. I need that player for 45 minutes.", hint: "Personal call-out" },
          ],
        },
      },
    ],
  },
]
```

**`index.ts`** — assembly + lookups:

```ts
// lib/characters/index.ts
import type { Character, CharacterCategoryId } from "@/lib/character"
import { COACHING_CHARACTERS } from "./coaching"
import { EVERYDAY_CHARACTERS } from "./everyday"
import { LANGUAGES_CHARACTERS } from "./languages"
import { PROFESSIONAL_CHARACTERS } from "./professional"
import { SPORTS_CHARACTERS } from "./sports"

export const BUILT_IN_CHARACTERS: Character[] = [
  ...LANGUAGES_CHARACTERS,
  ...PROFESSIONAL_CHARACTERS,
  ...COACHING_CHARACTERS,
  ...SPORTS_CHARACTERS,
  ...EVERYDAY_CHARACTERS,
]

export function isBuiltInCharacterId(value: string): boolean {
  return BUILT_IN_CHARACTERS.some((c) => c.id === value)
}

export function getBuiltInCharacter(id: string): Character {
  const character = BUILT_IN_CHARACTERS.find((c) => c.id === id)
  if (!character) throw new Error(`Unknown character: ${id}`)
  return character
}

export function builtInCharactersByCategory(
  category: CharacterCategoryId,
): Character[] {
  return BUILT_IN_CHARACTERS.filter((c) => c.category === category)
}
```

(`languages.ts` exports `LANGUAGES_CHARACTERS`, following the same template as `everyday.ts`.)

- [ ] **Step 4: Run tests and type-check**

Run: `bun test lib/character.test.ts && bunx tsc --noEmit`
Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/characters/ lib/character.test.ts
git commit -m "feat: built-in characters per category (migrated scenarios + Eva + 3 new)"
```

---

### Task 3: DB layer — rename client module, Character-shaped rows, compat mapper

**Files:**
- Rename: `lib/characters.ts` → `lib/character-db.ts` (git mv; update the 4 importers: `components/scenario-picker.tsx:9`, `app/play/character/[characterId]/page.tsx:8`, plus `grep -rl "from \"@/lib/characters\"" app components lib` for the rest)
- Create: `lib/character-compat.ts`
- Modify: `lib/workspace-types.ts:23-29` (`CharacterRow.scenario` type)
- Test: `lib/character-compat.test.ts`

**Interfaces:**
- Consumes: `Character`, `scenarioToCharacter` from `@/lib/character`.
- Produces:
  - `rowToCharacter(row: CharacterRow): Character` (from `@/lib/character-compat`)
  - `lib/character-db.ts`: `saveCharacter(character: Character, workspaceId?: string): Promise<CharacterRow>` (signature changes from `Scenario` to `Character`); all other functions unchanged.
  - `CharacterRow.scenario: Character | Scenario` (old rows carry `Scenario`, new rows carry `Character`).

- [ ] **Step 1: Write the failing test**

```ts
// lib/character-compat.test.ts
import { describe, expect, test } from "bun:test"

import { rowToCharacter } from "@/lib/character-compat"
import type { Character } from "@/lib/character"
import type { CharacterRow } from "@/lib/workspace-types"

const base = { id: "row-1", created_by: "u", workspace_id: null, created_at: "" }

describe("rowToCharacter", () => {
  test("passes through new-shape rows, forcing id to the row id", () => {
    const character: Character = {
      id: "stale-id",
      name: "New",
      tagline: "t",
      category: "coaching",
      avatarPrompt: "a",
      voice: { ageRange: "30", tone: "calm" },
      persona: "p",
      levels: [{ kind: "voice", id: "main", title: "New", subtitle: "t" }],
    }
    const row = { ...base, scenario: character } as CharacterRow
    const result = rowToCharacter(row)
    expect(result.id).toBe("row-1")
    expect(result.levels).toHaveLength(1)
    expect(result.category).toBe("coaching")
  })

  test("upgrades old Scenario-shape rows to a 1-level Character", () => {
    const row = {
      ...base,
      scenario: {
        id: "custom:old",
        title: "Old Clerk",
        tagline: "legacy",
        goal: "win",
        meterLabel: "m",
        winMessage: "w",
        persona: "p",
        voice: { ageRange: "30", tone: "t" },
        content: { fr: { openingLine: null, starters: [] } },
        imagePrompt: "i",
      },
    } as unknown as CharacterRow
    const result = rowToCharacter(row)
    expect(result.id).toBe("row-1")
    expect(result.name).toBe("Old Clerk")
    expect(result.levels).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/character-compat.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/character-compat.ts
import { scenarioToCharacter, type Character } from "@/lib/character"
import type { Scenario } from "@/lib/scenarios"
import type { CharacterRow } from "@/lib/workspace-types"

function isCharacterShape(value: Character | Scenario): value is Character {
  return Array.isArray((value as Character).levels)
}

/** Old rows store a `Scenario`; new rows store a `Character`. Always trust the row uuid as id. */
export function rowToCharacter(row: CharacterRow): Character {
  if (isCharacterShape(row.scenario)) {
    return { ...row.scenario, id: row.id }
  }
  return scenarioToCharacter(row.scenario, row.id)
}
```

In `lib/workspace-types.ts` change line 27 from `scenario: Scenario` to:

```ts
  /** jsonb column. New rows store Character; pre-unification rows store Scenario. Read via rowToCharacter(). */
  scenario: Character | Scenario
```

(add `import type { Character } from "@/lib/character"` at the top).

`git mv lib/characters.ts lib/character-db.ts`, change `saveCharacter`'s first parameter to `character: Character` (insert payload stays `scenario: character` — same column), fix all `from "@/lib/characters"` imports to `@/lib/character-db`. Callers that passed a `Scenario` (custom-scenario-builder — updated properly in Task 7) get a temporary local conversion via `scenarioToCharacter(scenario, crypto.randomUUID())` if needed to keep tsc green — check each call site.

- [ ] **Step 4: Run tests and type-check**

Run: `bun test && bunx tsc --noEmit`
Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: character-db module, Character rows in existing jsonb column, compat read-mapper"
```

---

### Task 4: Prompts keyed by mode, `/api/score` de-specialized

**Files:**
- Modify: `lib/prompts/index.ts` (full rewrite, 47 lines), `lib/prompts/roleplay.ts`, `app/api/score/route.ts:30-93,214-222`
- Rename: `lib/prompts/language.ts` → `lib/prompts/coach.ts`, `lib/prompts/spiritual.ts` → `lib/prompts/open.ts`

**Interfaces:**
- Consumes: `Scenario` (now with `mode`/`deliveryStyle`/`coachingStyle`).
- Produces: `buildCharacterPrompt(ctx: PromptContext): string` where

```ts
export type PromptContext = {
  scenario: Scenario
  characterGender: "male" | "female"
  history: ConversationTurn[]
  currentMeter: number
  phrase?: string
  languageName: string
  region: Region
}
```

- [ ] **Step 1: Rewrite `lib/prompts/index.ts`**

```ts
import type { Region } from "@/lib/languages"
import type { Scenario } from "@/lib/scenarios"
import type { ConversationTurn } from "@/lib/types"

import { buildCoachPrompt } from "@/lib/prompts/coach"
import { buildOpenPrompt } from "@/lib/prompts/open"
import { buildRoleplayPrompt } from "@/lib/prompts/roleplay"

export type PromptContext = {
  scenario: Scenario
  characterGender: "male" | "female"
  history: ConversationTurn[]
  currentMeter: number
  phrase?: string
  languageName: string
  region: Region
}

export function buildCharacterPrompt(ctx: PromptContext): string {
  switch (ctx.scenario.mode ?? "roleplay") {
    case "coach":
      return buildCoachPrompt(ctx)
    case "open":
      return buildOpenPrompt(ctx)
    default:
      return buildRoleplayPrompt(ctx)
  }
}
```

- [ ] **Step 2: Adapt the three prompt builders**

Each builder's signature becomes `(ctx: PromptContext) => string`. Behavior-preserving translation of the current bodies:
- `coach.ts` (was `language.ts`): wherever it read `agent.personaBase` / agent fields, read `ctx.scenario.persona` / `ctx.scenario.coachingStyle ?? ""`; `phrase`/`languageName`/`region` from ctx.
- `roleplay.ts`: it already takes `(scenario, characterGender, history, currentMeter, phrase, languageName, region, _, agent)`. Collapse to ctx; wherever it read `agent?.deliveryStyle` / `agent?.coachingStyle` / `agent?.personaBase`, read `ctx.scenario.deliveryStyle` / `ctx.scenario.coachingStyle` / (persona is already `scenario.persona`). Delete the now-unused `agent` parameter and `VoiceAgent` import.
- `open.ts` (was `spiritual.ts`): replace `agent.name`/`agent.personaBase` with `ctx.scenario.title`/`ctx.scenario.persona`; keep the "open conversation, no scoring, overall_score 0" contract text verbatim.

- [ ] **Step 3: De-specialize `/api/score`**

In `app/api/score/route.ts`: delete `buildLegacyPrompt` entirely (lines 30-93 — including the `scenario.id === "teacher"` branch and both inline fake-`VoiceAgent` literals) and the `@/lib/agents` type imports. Replace the call at line 214 with:

```ts
  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  const prompt = buildCharacterPrompt({
    scenario,
    characterGender,
    history: cappedHistory,
    currentMeter,
    phrase,
    languageName: language.name,
    region,
  })
```

Built-in scenarioId resolution: keep `resolveScenario` exactly as-is (built-in ids still resolve from `SCENARIOS` until Task 10 removes them; after Task 5 the client always sends the converter's payload as `customScenario`, so this path is only backward compatibility within the transition).

- [ ] **Step 4: Fix remaining references**

Run: `grep -rn "buildAgentPrompt\|buildLanguagePrompt\|buildSpiritualPrompt\|prompts/language\|prompts/spiritual" app lib components`
Expected after fixes: no matches. `lib/types.ts` still exports agent types — leave until Task 10.

- [ ] **Step 5: Type-check + tests, commit**

Run: `bunx tsc --noEmit && bun test`
Expected: exit 0 / PASS.

```bash
git add -A
git commit -m "refactor: prompt selection by scenario mode; remove teacher/agent special-casing from /api/score"
```

---

### Task 5: Engine — `PracticeSession` consumes `(character, levelIndex)`; split hook + HUD

**Files:**
- Modify: `components/practice-session.tsx` (751 lines)
- Create: `hooks/use-conversation.ts`, `components/session-hud.tsx`
- Modify (callers, minimal edits to stay compiling): `app/play/[scenarioId]/page.tsx`, `app/play/character/[characterId]/page.tsx`, `app/workspaces/[workspaceId]/play/[characterId]/page.tsx`, `components/free-play-experience-runner.tsx` (all four are DELETED in Task 6 — here they just get the thinnest possible adaptation, wrapping their scenario via `scenarioToCharacter(scenario, scenario.id)`)

**Interfaces:**
- Consumes: `Character`, `characterLevelScenario`, `scenarioToCharacter` from `@/lib/character`.
- Produces:

```ts
// components/practice-session.tsx
export type PracticeSessionProps = {
  character: Character
  levelIndex: number
  onBack: () => void
  backLabel?: string
  /** Multi-level: advance to next level once this one's goal is achieved */
  onContinue?: () => void
  continueLabel?: string
}

// hooks/use-conversation.ts — the record→score→tts loop extracted verbatim
export function useConversation(options: {
  scenario: Scenario
  languageId: LanguageId
  regionId: RegionId
}): {
  history: ConversationTurn[]
  meter: number
  score: PronunciationScore | null
  goalAchieved: boolean
  busy: boolean
  error: string | null
  submitAudio: (audio: { base64: string; format: string }) => Promise<void>
  playReply: () => Promise<void>
  reset: () => void
}
```

- [ ] **Step 1: Extract `useConversation`**

Behavior-preserving MOVE: lift the state and callbacks in `practice-session.tsx` that (a) hold `history`/`meter`/`score`/`goalAchieved`, (b) build the `/api/score` request body via `authenticatedFetch`, (c) call `resolveMeterUpdate`, (d) trigger `/api/tts` playback — into `hooks/use-conversation.ts` with the signature above. The `/api/score` request body MUST now always send the wire payload: `scenarioId: scenario.id, customScenario: scenario` (the scenario is the converter output, so the server's custom-path handles built-ins and customs uniformly). Keep gender/voice resolution (`resolveCharacterGender`, `resolveCharacterVoice`) inside the hook.

- [ ] **Step 2: Extract `SessionHUD`**

Behavior-preserving MOVE of pure display JSX into `components/session-hud.tsx`: `WordChip`, `ExampleSuggestionCard`, `scoreColor`/`scoreBg`/`meterColor`, the meter bar, transcript + word-score row, coaching text block. Exported component:

```ts
export function SessionHUD(props: {
  score: PronunciationScore | null
  meter: number
  meterLabel: string | null
  selectedWord: WordScore | null
  onSelectWord: (word: WordScore | null) => void
  suggestions: SentenceSuggestion[]
  onPickSuggestion: (sentence: SentenceSuggestion) => void
}): JSX.Element
```

- [ ] **Step 3: Re-point `PracticeSession` at `(character, levelIndex)`**

- Replace the props type (`components/practice-session.tsx:66-74`) with `PracticeSessionProps` above. Delete `ExperienceMeta`, `experienceAgent`, `experienceMeta`, `onExperienceContinue`, `experienceContinueLabel`, the `hasCapability`/`VoiceAgent` imports (`practice-session.tsx:23-25`), and the `ExperiencePassCriteria` import.
- Derive internally:

```ts
const { languageId, regionId } = useLanguage()
const scenario = useMemo(
  () => characterLevelScenario(character, levelIndex, languageId),
  [character, levelIndex, languageId],
)
const levelTotal = character.levels.length
const level = character.levels[levelIndex]
const isOpenMode = scenario.mode === "open"
```

- Level strip: render `<ExperienceLevelStrip …>` (renamed `LevelStrip` in Task 6) only when `levelTotal > 1`, driven by `character.levels` + `levelIndex` instead of `experienceMeta`.
- Continue flow: where the old code checked `experienceMeta.passCriteria === "goal"` and `EXPERIENCE_GOAL_WIN_METER`, now use: show the continue button when `onContinue` is set and `goalAchieved` (or meter ≥ 90 with a goal present) — same constants, `experience` prefix dropped (`GOAL_WIN_METER`, `ROLEPLAY_START_METER`).
- Open mode (`isOpenMode`): no meter bar, no goal banner, no completion confetti — matches the old spiritual behavior of `overall_score 0 / meter 0`.
- `markScenarioCompleted(scenario.id)` becomes `markScenarioCompleted(character.id)` so completion tracks the character, not the synthetic level id. `lib/completions.ts` is typed to the old `ScenarioId` union — loosen its signatures to plain `string` in this task (`markScenarioCompleted(id: string)`, `getCompletedScenarios(): string[]`), localStorage payload unchanged.

- [ ] **Step 4: Thin-adapt the four current callers (they die in Task 6)**

Each currently passes `scenario={...}`. Change to:

```ts
<PracticeSession
  character={scenarioToCharacter(scenario, scenario.id)}
  levelIndex={0}
  onBack={...}
/>
```

`free-play-experience-runner.tsx`: replace its `buildExperienceLevelScenario`+`experienceMeta` wiring with `character={getBuiltInCharacter("captain-eva")} levelIndex={levelIndex} onContinue={advanceLevel} continueLabel={continueLabel}` (voice levels) — gesture path untouched for now.

- [ ] **Step 5: Type-check + tests + manual smoke, commit**

Run: `bunx tsc --noEmit && bun test`
Expected: exit 0 / PASS.
Manual smoke (dev server `bun run dev`): play `teacher` (coach mode — scoring, no meter), play `vendor` (meter moves), play cabin-crew levels 1→3 including continue buttons.

```bash
git add -A
git commit -m "refactor: PracticeSession consumes (character, levelIndex); extract useConversation + SessionHUD"
```

---

### Task 6: One play route `/play/[characterId]` + `CharacterSession`

**Files:**
- Create: `app/play/[characterId]/page.tsx` (NOTE: `app/play/[scenarioId]` must be deleted in the same commit — Next.js forbids two dynamic segments at one level)
- Create: `components/character-session.tsx`
- Rename: `components/experience-level-strip.tsx` → `components/level-strip.tsx` (component `LevelStrip`, props driven by `levels: Level[]` + `levelIndex: number`)
- Modify: `components/gesture-session.tsx` (props: `agent: VoiceAgent` → `character: Character`; read `character.name`, `character.avatarPrompt`, `character.voice` where agent fields were read)
- Modify (navigation): `components/free-play-section.tsx`, `components/workspace-detail-page.tsx`
- Delete: `app/play/[scenarioId]/page.tsx`, `app/play/character/[characterId]/page.tsx`, `app/play/experience/[experienceId]/page.tsx`, `app/workspaces/[workspaceId]/play/[characterId]/page.tsx`, `components/free-play-experience-runner.tsx`, `components/featured-experience-picker.tsx`

**Interfaces:**
- Consumes: `getBuiltInCharacter`, `isBuiltInCharacterId` (`@/lib/characters/index`); `getCharacter` (`@/lib/character-db`); `rowToCharacter` (`@/lib/character-compat`).
- Produces: `CharacterSession({ character, onBack, backLabel }: { character: Character; onBack: () => void; backLabel?: string })` — the only session entry point; card `onSelect` handlers navigate to `/play/{id}` (+ `?from=workspace:{workspaceId}` inside a workspace).

- [ ] **Step 1: `components/character-session.tsx`**

```tsx
"use client"

import { useState } from "react"

import { GestureSession } from "@/components/gesture-session"
import { PracticeSession } from "@/components/practice-session"
import type { Character } from "@/lib/character"

type CharacterSessionProps = {
  character: Character
  onBack: () => void
  backLabel?: string
}

export function CharacterSession({ character, onBack, backLabel }: CharacterSessionProps) {
  const [levelIndex, setLevelIndex] = useState(0)
  const level = character.levels[levelIndex]
  const isLast = levelIndex >= character.levels.length - 1

  function advance() {
    if (isLast) return onBack()
    setLevelIndex((i) => i + 1)
  }

  const next = character.levels[levelIndex + 1]
  const continueLabel = isLast
    ? `Back to ${backLabel?.toLowerCase() ?? "free play"}`
    : next
      ? `Continue — ${next.title}`
      : "Continue"

  if (!level) return null

  if (level.kind === "gesture") {
    return (
      <GestureSession
        key={`${character.id}-${level.id}`}
        character={character}
        steps={level.steps}
        holdMs={level.holdMs}
        sessionTitle={level.title}
        winMessage={level.winMessage}
        levelIndex={levelIndex}
        levelTotal={character.levels.length}
        onComplete={advance}
        onBack={onBack}
        backLabel={backLabel}
        completeLabel={continueLabel}
      />
    )
  }

  return (
    <PracticeSession
      key={`${character.id}-${level.id}`}
      character={character}
      levelIndex={levelIndex}
      onBack={onBack}
      backLabel={backLabel}
      onContinue={level.goal || !isLast ? advance : undefined}
      continueLabel={continueLabel}
    />
  )
}
```

- [ ] **Step 2: `app/play/[characterId]/page.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { CharacterSession } from "@/components/character-session"
import type { Character } from "@/lib/character"
import { rowToCharacter } from "@/lib/character-compat"
import { getCharacter } from "@/lib/character-db"
import { getBuiltInCharacter, isBuiltInCharacterId } from "@/lib/characters/index"

export default function PlayCharacterPage() {
  const params = useParams<{ characterId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [character, setCharacter] = useState<Character | null>(null)
  const [error, setError] = useState("")

  const from = searchParams.get("from")
  const workspaceId = from?.startsWith("workspace:") ? from.slice("workspace:".length) : null
  const backTarget = workspaceId ? `/workspaces/${workspaceId}` : "/#free-play"
  const backLabel = workspaceId ? "Workspace" : "Free play"

  useEffect(() => {
    const id = decodeURIComponent(params.characterId)
    if (isBuiltInCharacterId(id)) {
      setCharacter(getBuiltInCharacter(id))
      return
    }
    getCharacter(id)
      .then((row) => {
        if (!row) throw new Error("Character not found")
        setCharacter(rowToCharacter(row))
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load character"),
      )
  }, [params.characterId])

  if (error) return <p className="px-6 py-12 text-sm text-destructive">{error}</p>
  if (!character) return <p className="px-6 py-12 text-sm text-muted-foreground">Loading…</p>

  return (
    <AuthGate>
      <CharacterSession
        key={character.id}
        character={character}
        onBack={() => router.push(backTarget)}
        backLabel={backLabel}
      />
    </AuthGate>
  )
}
```

- [ ] **Step 3: Update navigation call sites**

- `components/free-play-section.tsx`: `onSelect` handler becomes `router.push(`/play/${encodeURIComponent(selection.character.id)}`)` (selection type updated in Task 8; for now adapt to the existing `CharacterSelection` fields: push the `characterId` when present, else the scenario id — built-in scenario ids ARE built-in character ids by construction).
- `components/workspace-detail-page.tsx`: play navigation becomes `` router.push(`/play/${row.id}?from=workspace:${workspaceId}`) ``.
- Delete the four old play pages, `free-play-experience-runner.tsx`, `featured-experience-picker.tsx`; remove the `FeaturedExperiencePicker` import/render from `free-play-section.tsx` (its replacement arrives in Task 8; temporarily the section shows only the grid).

- [ ] **Step 4: Verify no dangling references**

Run: `grep -rn "free-play-experience-runner\|featured-experience-picker\|play/experience\|play/character\|scenarioId\]" app components lib --include='*.ts*'`
Expected: no matches (except this plan/spec under docs/).

- [ ] **Step 5: Type-check + tests + smoke, commit**

Run: `bunx tsc --noEmit && bun test`
Manual smoke: `/play/teacher`, `/play/captain-eva` (all 3 levels incl. camera), `/play/{uuid}` for a saved custom, workspace character with `?from=` back button.

```bash
git add -A
git commit -m "feat: single /play/[characterId] route + CharacterSession level runner; delete 4 legacy play surfaces"
```

---

### Task 7: Generation — `/api/character/generate`, builder rename, kill "track" vocabulary

**Files:**
- Rename: `app/api/scenario/generate/route.ts` → `app/api/character/generate/route.ts`
- Rename: `lib/scenario-generate-schema.ts` → `lib/character-generate-schema.ts`
- Rename: `components/custom-scenario-builder.tsx` → `components/character-builder.tsx` (component `CharacterBuilder`)
- Modify: `components/character-grid.tsx` (imports the renamed builder)

**Interfaces:**
- Consumes: `Character`, `CharacterCategoryId` from `@/lib/character`; `saveCharacter(character, workspaceId?)` from `@/lib/character-db`.
- Produces:
  - `generatedPayloadToCharacter(payload: GeneratedCharacterPayload, opts: { id: string; languageId: LanguageId; sourceLabel?: string }): Character` (exported from `lib/character-generate-schema.ts`)
  - POST `/api/character/generate` — request field `trackCount` renamed `characterCount`; response `{ characters: GeneratedCharacterPayload[] }` (was `scenarios`).

- [ ] **Step 1: Rename files with git mv, rename exported symbols**

`GeneratedScenarioPayload` → `GeneratedCharacterPayload`; `generatedScenarioJsonSchema` → `generatedCharacterJsonSchema`; `buildGeneratedScenariosBatchSchema(count)` → `buildGeneratedCharactersBatchSchema(count)` (inner array property `scenarios` → `characters`); `validateGeneratedScenarioPayload` → `validateGeneratedCharacterPayload`. The JSON-schema FIELDS stay as they are (flat single-level shape — a generated character is a 1-voice-level Character; gesture levels are never generated).

- [ ] **Step 2: Add the payload→Character mapper**

```ts
// append to lib/character-generate-schema.ts
import type { Character } from "@/lib/character"
import type { LanguageId } from "@/lib/languages"

export function generatedPayloadToCharacter(
  payload: GeneratedCharacterPayload,
  opts: { id: string; languageId: LanguageId; sourceLabel?: string },
): Character {
  return {
    id: opts.id,
    name: payload.title,
    tagline: payload.tagline,
    category: "everyday",
    avatarPrompt: payload.imagePrompt,
    voice: payload.voice,
    persona: payload.persona,
    primaryLanguageId: opts.languageId,
    sourceLabel: opts.sourceLabel,
    levels: [
      {
        kind: "voice",
        id: "main",
        title: payload.title,
        subtitle: payload.tagline,
        goal: payload.goal,
        meterLabel: payload.meterLabel,
        winMessage: payload.winMessage,
        content: { openingLine: payload.openingLine, starters: payload.starters },
      },
    ],
  }
}
```

- [ ] **Step 3: Purge "track"/"scenario" vocabulary from the route**

In the renamed route: request param `trackCount` → `characterCount`; prompt text "Generate exactly N distinct practice tracks" → "Generate exactly N distinct practice characters"; response key `scenarios` → `characters`. Search: `grep -rn "track" app/api lib components --include='*.ts*'` — expected no matches after this step (docs excluded).

- [ ] **Step 4: Update the builder**

`components/character-builder.tsx` (renamed): call the renamed endpoint, map each payload via `generatedPayloadToCharacter(payload, { id: crypto.randomUUID(), languageId, sourceLabel })`, then `saveCharacter(character, workspaceId)`. `onCreated` callback now receives `CharacterRow[]` as before (no shape change for the grid). Remove the Task-3 temporary conversions at call sites.

- [ ] **Step 5: Type-check + tests + smoke, commit**

Run: `bunx tsc --noEmit && bun test`
Manual smoke: create a character from a prompt in Free Play; create one inside a workspace; play both.

```bash
git add -A
git commit -m "refactor: /api/character/generate + CharacterBuilder; remove track vocabulary"
```

---

### Task 8: Home page — category rows, hero copy, single Workspaces CTA

**Files:**
- Modify: `components/character-grid.tsx` (cards take `Character`, not `Scenario`)
- Modify: `components/free-play-section.tsx` (category rows)
- Rename: `components/track-catalogue.tsx` → `components/home-hero.tsx`
- Modify: `app/page.tsx`, `components/site-header.tsx`, `components/scenario-picker.tsx` → DELETE (fold into free-play-section), `components/workspace-detail-page.tsx`, `components/scenario-scene.tsx` (only if its props reference `ScenarioId` — pass plain `string` id + `imagePrompt`)

**Interfaces:**
- Consumes: `CATEGORIES`, `builtInCharactersByCategory`, `levelBadge` (`@/lib/character`, `@/lib/characters/index`); `listPersonalCharacters` (`@/lib/character-db`); `rowToCharacter`.
- Produces:

```ts
// components/character-grid.tsx
export type CharacterSelection = { character: Character; rowId?: string }
export function CharacterGrid(props: {
  characters: Character[]
  completedIds?: string[]
  showCreateCard?: boolean
  workspaceId?: string
  workspaceContext?: { name: string; description?: string | null }
  onSelect: (selection: CharacterSelection) => void
  onCharacterCreated?: (rows: CharacterRow[]) => void
  onCharacterDeleted?: (characterId: string) => void
  deletableIds?: string[]
}): JSX.Element
```

- [ ] **Step 1: Re-type `CharacterGrid` around `Character`**

`ScenarioCard` → `CharacterCard({ character, completed, deletable, onSelect, onDelete })`: title→`character.name`, tagline→`character.tagline`, goal footer → first voice level's `goal`, image → `<ScenarioScene scenarioId={isBuiltInCharacterId(character.id) ? character.id : undefined} imagePrompt={!isBuiltInCharacterId(character.id) ? character.avatarPrompt : undefined} …/>`, and a `levelBadge(character)` chip (top-left, e.g. "3 levels · Voice · Camera") when non-null. `featured` characters render `sm:col-span-2` with `h-44` image.

- [ ] **Step 2: Category rows in `FreePlaySection`**

Replace the current body (FeaturedExperiencePicker remnant + ScenarioPicker) with:

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { CharacterGrid } from "@/components/character-grid"
import { CATEGORIES } from "@/lib/character"
import { rowToCharacter } from "@/lib/character-compat"
import { deleteCharacter, listPersonalCharacters } from "@/lib/character-db"
import { builtInCharactersByCategory } from "@/lib/characters/index"
import { getCompletedScenarios } from "@/lib/completions"
import type { CharacterRow } from "@/lib/workspace-types"

export function FreePlaySection() {
  const router = useRouter()
  const [rows, setRows] = useState<CharacterRow[]>([])
  const [completed] = useState<string[]>(() => getCompletedScenarios())

  useEffect(() => {
    listPersonalCharacters().then(setRows).catch(() => setRows([]))
  }, [])

  const yours = rows.map(rowToCharacter)

  const play = (id: string) => router.push(`/play/${encodeURIComponent(id)}`)

  return (
    <section id="free-play" className="border-t">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">Free play</h2>
          <p className="text-muted-foreground">
            Every card is an AI character built with the same engine you can use
            below. Language and accent live in settings (top right).
          </p>
        </div>

        {CATEGORIES.map((category) => (
          <div key={category.id} className="mb-10">
            <h3 className="text-lg font-semibold tracking-tight">{category.label}</h3>
            <p className="mb-4 text-sm text-muted-foreground">{category.tagline}</p>
            <CharacterGrid
              characters={builtInCharactersByCategory(category.id)}
              completedIds={completed}
              showCreateCard={false}
              onSelect={({ character }) => play(character.id)}
            />
          </div>
        ))}

        <div className="mb-10">
          <h3 className="text-lg font-semibold tracking-tight">Yours</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Characters you created — from a prompt, PDF, or course upload.
          </p>
          <CharacterGrid
            characters={yours}
            completedIds={completed}
            showCreateCard
            deletableIds={yours.map((c) => c.id)}
            onSelect={({ character }) => play(character.id)}
            onCharacterCreated={(created) => setRows((current) => [...created, ...current])}
            onCharacterDeleted={(id) => {
              void deleteCharacter(id)
              setRows((current) => current.filter((r) => r.id !== id))
            }}
          />
        </div>
      </div>
    </section>
  )
}
```

Delete `components/scenario-picker.tsx` (its `ScenarioBackButton` re-export moves to direct imports of `@/components/scenario-back-button`).

- [ ] **Step 3: Hero + CTA copy, rename `track-catalogue.tsx` → `home-hero.tsx`**

- `HomeHero` headline: **"Talk your way to any skill."** Subline: "Voice-first training with AI characters, from languages to leadership. Speak — they listen, respond in character, and coach you word by word." CTAs unchanged (Start free play / Open workspaces).
- `WorkspacesCta` copy: heading "Build your own characters", body "Everything above was built with the same engine. Create a workspace, generate characters from a prompt or a PDF, and share them with your team via one link." Single button → `/workspaces`.
- `app/page.tsx` imports from `@/components/home-hero`.
- `app/layout.tsx` `<title>`: "Parler Bien — Talk your way to any skill".

- [ ] **Step 4: Workspace page grid**

`components/workspace-detail-page.tsx`: map rows via `rowToCharacter`, pass `characters={rows.map(rowToCharacter)}`, `deletableIds`, `onSelect` → `` router.push(`/play/${rowId ?? character.id}?from=workspace:${workspaceId}`) `` (pass `rowId` through `CharacterSelection` when the card came from a DB row).

- [ ] **Step 5: Type-check + tests + smoke, commit**

Run: `bunx tsc --noEmit && bun test`
Manual smoke: home shows 5 category rows + Yours; Eva card is wide with the 3-level badge; create-your-own only in Yours; workspace grid plays with correct back button.

```bash
git add -A
git commit -m "feat: category-row Free Play, home-hero rename, unified copy"
```

---

### Task 9: `lib/types.ts` + score request cleanup

**Files:**
- Modify: `lib/types.ts`, `app/api/score/route.ts`, `hooks/use-conversation.ts`

**Interfaces:**
- Produces: `ScoreRequest` without `agentType`/`agent` (drop lines `lib/types.ts:61-62` and the `AgentType`/`VoiceAgent` imports/re-exports at lines 1 and 65).

- [ ] **Step 1: Remove agent fields from `ScoreRequest` and re-exports**

Delete from `lib/types.ts`: the `@/lib/agents` import (line 1), `agentType?`/`agent?` fields (61-62), and the line-65 re-export. Run `grep -rn "AgentType\|VoiceAgent\|AgentCapability\|AgentSkill" app components lib hooks --include='*.ts*'` and fix every remaining reference (expected: only `lib/agents.ts` itself matches afterward).

- [ ] **Step 2: Type-check + tests, commit**

Run: `bunx tsc --noEmit && bun test`

```bash
git add -A
git commit -m "refactor: drop agent fields from score request types"
```

---

### Task 10: Sweep — delete dead modules, fold wire helpers into `lib/character.ts`, README

**Files:**
- Delete: `lib/agents.ts`, `lib/free-play-experiences.ts`
- Move-and-delete: `lib/scenarios.ts` → runtime pieces move INTO `lib/character.ts`; the file is deleted
- Modify: every importer of `@/lib/scenarios` (grep-driven), `README.md`, `lib/types.ts:36` (re-export from `@/lib/character`)

- [ ] **Step 1: Fold the wire layer into `lib/character.ts`**

Move verbatim from `lib/scenarios.ts` into `lib/character.ts` (keeping exported names identical): `Scenario`, `ScenarioId`, `CustomScenarioId`, `ScenarioContent`, `CharacterGender`, `CharacterGenderMode`, `CharacterVoiceMap`, `resolveCharacterGender`, `randomCharacterGender`, `resolveCharacterVoice`, `isCustomScenarioId`, `getScenarioContent`, `formatPersona`, `EMPTY_CONTENT`. Adjustments while moving:
- `ScenarioId` becomes `export type ScenarioId = string` (the built-in union dies with `SCENARIOS`).
- `resolveScenario(scenarioId, customScenario)`: built-in branch now resolves via `getBuiltInCharacter(id)` + `characterLevelScenario(character, firstVoiceLevelIndex, DEFAULT_LANGUAGE_ID)`; custom branch unchanged. (Clients always send `customScenario`, so this is defense-in-depth.)
- `isBuiltInScenarioId` is superseded by `isBuiltInCharacterId` — update the two remaining callers found via grep.
- `resolveCharacterGender`'s `scenario.id === "teacher"` special case: replace with `scenario.mode === "coach" ? "opposite-speaker" : "random"` as the default.
- Delete `SCENARIOS`, `getScenario`, `isScenarioId`.

- [ ] **Step 2: Update all `@/lib/scenarios` imports to `@/lib/character`, delete the three files**

Run: `grep -rln "@/lib/scenarios\|@/lib/agents\|@/lib/free-play-experiences" app components lib hooks` — update every hit, then `git rm lib/scenarios.ts lib/agents.ts lib/free-play-experiences.ts`. Re-run the grep: zero matches.

- [ ] **Step 3: README + AGENTS.md**

`README.md` line 3 becomes: "Talk your way to any skill — voice-first training with AI characters, from languages to leadership. Built on Supabase Auth and OpenRouter." Fix the stale `cd Raise-Hack` clone instructions to the actual repo directory name. Skim `AGENTS.md` for references to deleted concepts (tracks, personas, experiences) and correct them.

- [ ] **Step 4: Full verification**

Run: `bunx tsc --noEmit && bun test && bun run build`
Expected: all green.
Manual smoke (full pass): (a) home shows hero + 5 category rows + Yours + one Workspaces CTA; (b) play `teacher`, `vendor`, `siddhartha` (open — no meter), `halftime-coach`; (c) `captain-eva` through all 3 levels including camera; (d) create a custom character from a prompt, play it, delete it; (e) workspace: create, generate a character inside it, play with workspace back button, invite link via `/share/[token]` still joins.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: sweep — delete agents/experiences/scenarios modules, fold wire layer into character, README rewrite"
```

---

## Post-plan checks

- `git log --oneline` shows ~11 small commits from baseline to sweep.
- `grep -rn "experience\|VoiceAgent\|AgentType" app components lib hooks --include='*.ts*'` → no domain-model hits (incidental words like "user experience" in copy are fine).
- Old DB rows (pre-unification `Scenario` jsonb) still load and play via `rowToCharacter` — verify with a row created before Task 3 if one exists.
