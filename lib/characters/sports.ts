import type { Character } from "@/lib/character"
import { SPORTS_PEP_GESTURES } from "@/lib/gestures"

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
          en: {
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
      },
      {
        kind: "voice",
        id: "halftime-l2-coach",
        title: "Rally cries",
        subtitle: "Drill the lines that actually fire up a tired locker room",
        mode: "coach",
        personaOverlay: `COACH MODE: You are the captain, but your job is coaching the coach's delivery — no morale meter. Drill one rally phrase at a time. Listen, give feedback on energy and clarity, ask them to repeat louder and cleaner. Phrases: reset-the-half opener, tactical pivot, personal call-out.`,
        content: {
          en: {
            openingLine: {
              text: "Alright coach — say it like you mean it. Repeat: « That half is gone. The next forty-five are ours. »",
              hint: "Short, punchy, believable",
            },
            starters: [
              { text: "Heads up — that half is gone.", hint: "Reset energy" },
              { text: "We win the second balls or we lose this match.", hint: "Tactical clarity" },
              { text: "Marco — I need the player I know is in there.", hint: "Personal call-out" },
            ],
          },
        },
      },
      {
        kind: "gesture",
        id: "halftime-l3-presence",
        title: "Sideline presence",
        subtitle: "Body language the team reads before you even speak",
        steps: SPORTS_PEP_GESTURES,
        winMessage: "The room sees it — you're ready to lead them back out.",
        holdMs: 1400,
      },
      {
        kind: "voice",
        id: "halftime-l4-timeout",
        title: "Crunch-time timeout",
        subtitle: "Down one with two minutes left — one last huddle",
        status: "locked",
        lockLabel: "Pro",
      },
      {
        kind: "voice",
        id: "halftime-l5-finals",
        title: "Championship speech",
        subtitle: "The trophy is in the building — leave nothing in the locker room",
        status: "wip",
        lockLabel: "Coming soon",
      },
    ],
  },
]
