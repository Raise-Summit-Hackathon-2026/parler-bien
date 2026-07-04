import type { VoiceAgent } from "@/lib/agents"
import { getAgent } from "@/lib/agents"
import { CABIN_SAFETY_GESTURES, type GestureStep } from "@/lib/gestures"
import type { SentenceSuggestion } from "@/lib/types"
import type { ScenarioId } from "@/lib/scenarios"

export type PassCriteria =
  | { type: "pronunciation"; minScore: number }
  | { type: "goal"; minMeter?: number }
  | { type: "complete"; minTurns: number }
  | { type: "gesture"; steps: GestureStep[]; holdMs?: number }

export type LevelRoom = {
  scenarioId?: ScenarioId
  customPersonaOverlay?: string
  targetPhrase?: string
  openingLine?: SentenceSuggestion
  goal?: string | null
  meterLabel?: string | null
  winMessage?: string | null
  starters?: SentenceSuggestion[]
}

export type TrackLevel = {
  id: string
  order: number
  title: string
  subtitle: string
  status: "playable" | "wip"
  agentId: string
  room: LevelRoom
  passCriteria: PassCriteria
}

export type LearningTrack = {
  id: string
  title: string
  description: string
  themeColor: string
  primaryAgentId: string
  levels: TrackLevel[]
  estimatedMinutes: number
  /** When set, track appears inside a company hub instead of the main grid */
  companyId?: string
}

export const STANDALONE_TRACK_IDS = [
  "french-pronunciation",
  "cabin-crew",
  "path-with-buddha",
] as const

export type LevelStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "wip"

export const TRACKS: LearningTrack[] = [
  {
    id: "french-pronunciation",
    title: "Say It Right: French",
    description:
      "Master essential French sounds — from croissant to café orders — with Marie as your coach.",
    themeColor: "#3b82f6",
    primaryAgentId: "marie-french-coach",
    estimatedMinutes: 15,
    levels: [
      {
        id: "french-l1-croissant",
        order: 1,
        title: "Croissant",
        subtitle: "The classic French vowel challenge",
        status: "playable",
        agentId: "marie-french-coach",
        room: {
          targetPhrase: "Je voudrais un croissant",
          openingLine: {
            text: "Aujourd'hui, on commence avec le mot le plus français : croissant. Répétez après moi.",
            hint: "Today we start with the most French word: croissant. Repeat after me.",
          },
          winMessage: "Magnifique! Your croissant sounds delicious.",
        },
        passCriteria: { type: "pronunciation", minScore: 70 },
      },
      {
        id: "french-l2-bonjour",
        order: 2,
        title: "Bonjour",
        subtitle: "Greet like a Parisian",
        status: "playable",
        agentId: "marie-french-coach",
        room: {
          targetPhrase: "Bonjour, comment allez-vous?",
          openingLine: {
            text: "Très bien! Maintenant, saluons correctement. Dites « Bonjour, comment allez-vous? »",
            hint: "Very good! Now let's greet properly. Say 'Bonjour, comment allez-vous?'",
          },
          winMessage: "Parfait! You greet like a true Parisian.",
        },
        passCriteria: { type: "pronunciation", minScore: 72 },
      },
      {
        id: "french-l3-cafe",
        order: 3,
        title: "Un café",
        subtitle: "Order at a Parisian café",
        status: "playable",
        agentId: "marie-french-coach",
        room: {
          targetPhrase: "Je voudrais un café, s'il vous plaît",
          openingLine: {
            text: "Dernière étape : commandez un café comme un habitué. À vous!",
            hint: "Final step: order a coffee like a regular. Your turn!",
          },
          winMessage: "Bravo! You're ready for any café in Paris.",
        },
        passCriteria: { type: "pronunciation", minScore: 75 },
      },
      {
        id: "french-l4-liaison",
        order: 4,
        title: "Liaison drills",
        subtitle: "Connect your words naturally",
        status: "wip",
        agentId: "marie-french-coach",
        room: {
          targetPhrase: "Les amis arrivent",
        },
        passCriteria: { type: "pronunciation", minScore: 78 },
      },
      {
        id: "french-l5-market",
        order: 5,
        title: "Market haggle",
        subtitle: "Negotiate at the flea market",
        status: "wip",
        agentId: "marie-french-coach",
        room: {
          scenarioId: "vendor",
        },
        passCriteria: { type: "goal" },
      },
    ],
  },
  {
    id: "cabin-crew",
    title: "Cabin Crew Academy",
    description:
      "Train with Captain Eva — from safety briefings to landing announcements aboard flight 959.",
    themeColor: "#8b5cf6",
    primaryAgentId: "eva-cabin-crew",
    estimatedMinutes: 20,
    levels: [
      {
        id: "cabin-l1-safety",
        order: 1,
        title: "Safety demo",
        subtitle: "Learn the signs, then perform on camera",
        status: "playable",
        agentId: "eva-cabin-crew",
        room: {
          winMessage: "Perfect safety demonstration! Passengers are briefed and ready.",
        },
        passCriteria: {
          type: "gesture",
          steps: CABIN_SAFETY_GESTURES,
          holdMs: 1400,
        },
      },
      {
        id: "cabin-l2-turbulence",
        order: 2,
        title: "Turbulence reassurance",
        subtitle: "Calm nervous passengers",
        status: "playable",
        agentId: "eva-cabin-crew",
        room: {
          customPersonaOverlay: `SCENARIO: Moderate turbulence. A nervous passenger needs reassurance. Stay calm. Goal: reassure the passenger and get them to fasten seatbelt and remain seated.`,
          openingLine: {
            text: "We've hit some turbulence. There's a nervous passenger in 14B — they're white-knuckling the armrest. Help me calm them down.",
            hint: "Reassure a nervous passenger during turbulence",
          },
          goal: "Reassure the nervous passenger",
          meterLabel: "Passenger calm",
          winMessage: "Well handled! The passenger is calm and seated.",
          starters: [
            {
              text: "Sir, this is completely normal — please fasten your seatbelt and remain seated.",
              hint: "Reassure with authority and warmth",
            },
            {
              text: "We're experiencing a little turbulence, but our pilots have everything under control.",
              hint: "Explain the situation calmly",
            },
            {
              text: "Would you like some water? We'll be through this in just a few minutes.",
              hint: "Offer comfort",
            },
          ],
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "cabin-l3-landing",
        order: 3,
        title: "Landing announcement",
        subtitle: "Prepare for arrival",
        status: "playable",
        agentId: "eva-cabin-crew",
        room: {
          customPersonaOverlay: `SCENARIO: Final approach. Deliver a professional landing announcement. Goal: complete a clear landing announcement with seat upright, trays stowed, and arrival city mentioned.`,
          openingLine: {
            text: "We're on final approach. Captain has asked for the landing announcement. You're on — make it professional.",
            hint: "Deliver the landing announcement",
          },
          goal: "Deliver a clear landing announcement",
          meterLabel: "Announcement quality",
          winMessage: "Perfect landing announcement! Welcome to your destination.",
          starters: [
            {
              text: "Ladies and gentlemen, we are now on our final approach. Please return your seat to the upright position.",
              hint: "Standard landing opening",
            },
            {
              text: "Please ensure your tray table is stowed and your seatbelt is securely fastened.",
              hint: "Safety reminders",
            },
            {
              text: "On behalf of the entire crew, thank you for flying with us today. We hope to see you again soon.",
              hint: "Closing thank you",
            },
          ],
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "cabin-l4-medical",
        order: 4,
        title: "Medical emergency",
        subtitle: "Respond under pressure",
        status: "wip",
        agentId: "eva-cabin-crew",
        room: {
          customPersonaOverlay: "SCENARIO: Medical emergency mid-flight. WIP.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "cabin-l5-vip",
        order: 5,
        title: "VIP service",
        subtitle: "First-class hospitality",
        status: "wip",
        agentId: "eva-cabin-crew",
        room: {
          customPersonaOverlay: "SCENARIO: VIP passenger in first class. WIP.",
        },
        passCriteria: { type: "goal" },
      },
    ],
  },
  {
    id: "path-with-buddha",
    title: "Path with Buddha",
    description:
      "A gentle journey inward with Siddhartha — breath, letting go, and compassion.",
    themeColor: "#d97706",
    primaryAgentId: "siddhartha",
    estimatedMinutes: 12,
    levels: [
      {
        id: "buddha-l1-breath",
        order: 1,
        title: "Breath awareness",
        subtitle: "Notice the breath",
        status: "playable",
        agentId: "siddhartha",
        room: {
          customPersonaOverlay: `EXERCISE: Breath awareness. Guide the user to notice their breath for 3 exchanges. Ask gentle questions about what they notice.`,
          openingLine: {
            text: "Sit comfortably. Close your eyes if you wish. What do you notice about your breath right now?",
            hint: "A gentle invitation to notice breathing",
          },
          winMessage: "You have taken the first step on the path. The breath is always with you.",
        },
        passCriteria: { type: "complete", minTurns: 3 },
      },
      {
        id: "buddha-l2-letting-go",
        order: 2,
        title: "Letting go",
        subtitle: "Release what you carry",
        status: "playable",
        agentId: "siddhartha",
        room: {
          customPersonaOverlay: `EXERCISE: Letting go. Help the user identify something they are holding onto and gently release it. 3 exchanges minimum.`,
          openingLine: {
            text: "What is one thing you are carrying today — a worry, a tension, a thought that returns again and again?",
            hint: "Invite reflection on what to release",
          },
          winMessage: "What you release makes room for peace. Well done.",
        },
        passCriteria: { type: "complete", minTurns: 3 },
      },
      {
        id: "buddha-l3-compassion",
        order: 3,
        title: "Compassion practice",
        subtitle: "Kindness toward yourself",
        status: "playable",
        agentId: "siddhartha",
        room: {
          customPersonaOverlay: `EXERCISE: Compassion. Guide loving-kindness toward self and others. 3 exchanges minimum.`,
          openingLine: {
            text: "Think of someone you love. Now think of yourself. What would you say to them — and can you say it to you?",
            hint: "Loving-kindness toward self",
          },
          winMessage: "Compassion ripples outward from a calm heart. Namaste.",
        },
        passCriteria: { type: "complete", minTurns: 3 },
      },
      {
        id: "buddha-l4-walking",
        order: 4,
        title: "Walking meditation",
        subtitle: "Mindfulness in motion",
        status: "wip",
        agentId: "siddhartha",
        room: {
          customPersonaOverlay: "EXERCISE: Walking meditation. WIP.",
        },
        passCriteria: { type: "complete", minTurns: 3 },
      },
      {
        id: "buddha-l5-evening",
        order: 5,
        title: "Evening reflection",
        subtitle: "Close the day with gratitude",
        status: "wip",
        agentId: "siddhartha",
        room: {
          customPersonaOverlay: "EXERCISE: Evening reflection. WIP.",
        },
        passCriteria: { type: "complete", minTurns: 3 },
      },
    ],
  },
  // ——— Galeries Lafayette department tracks ———
  {
    id: "glaf-sales",
    title: "Sales Assistant",
    description:
      "Welcome VIP clients, advise on collections, and close with Parisian elegance on the Haussmann floor.",
    themeColor: "#c41e3a",
    primaryAgentId: "chloe-glaf-sales",
    companyId: "galeries-lafayette",
    estimatedMinutes: 18,
    levels: [
      {
        id: "glaf-sales-l1",
        order: 1,
        title: "Bonjour VIP",
        subtitle: "Greet a returning client at the entrance",
        status: "playable",
        agentId: "chloe-glaf-sales",
        room: {
          openingLine: {
            text: "Bonjour, bienvenue aux Galeries Lafayette. Je suis Chloé — comment puis-je vous accompagner aujourd'hui?",
            hint: "Warm VIP welcome at the store entrance",
          },
          goal: "Make the client feel uniquely welcomed",
          meterLabel: "Client rapport",
          winMessage: "Magnifique — your client feels like royalty.",
          starters: [
            {
              text: "Bonjour Madame, ravie de vous revoir. La collection printemps vous attend au second.",
              hint: "Personal welcome with direction",
            },
          ],
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-sales-l2",
        order: 2,
        title: "Le conseil",
        subtitle: "Recommend a piece with tact",
        status: "playable",
        agentId: "chloe-glaf-sales",
        room: {
          customPersonaOverlay:
            "SCENARIO: Client hesitating between two dresses. Advise with taste, never pushy. Goal: guide them toward a choice they feel proud of.",
          openingLine: {
            text: "Entre ces deux silhouettes… laquelle vous fait vibrer? Je peux vous montrer la rouge en 38.",
            hint: "Sensitive styling advice",
          },
          goal: "Help the client choose with confidence",
          meterLabel: "Trust",
          winMessage: "The client leaves delighted with their choice.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-sales-l3",
        order: 3,
        title: "Au revoir",
        subtitle: "Close the sale with grace",
        status: "playable",
        agentId: "chloe-glaf-sales",
        room: {
          customPersonaOverlay:
            "SCENARIO: Client at checkout. Offer gift wrap, mention personal shopper follow-up. Goal: elegant farewell that invites return.",
          goal: "Complete a memorable farewell",
          meterLabel: "Loyalty",
          winMessage: "Clientèle fidèle — they'll be back under the dome.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-sales-l4",
        order: 4,
        title: "Personal shopper",
        subtitle: "Full styling session",
        status: "wip",
        agentId: "chloe-glaf-sales",
        room: {},
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-sales-l5",
        order: 5,
        title: "Fashion show",
        subtitle: "Live event hosting",
        status: "wip",
        agentId: "chloe-glaf-sales",
        room: {},
        passCriteria: { type: "goal" },
      },
    ],
  },
  {
    id: "glaf-security",
    title: "Security",
    description:
      "Protect the floor with calm authority — bag checks, discreet intervention, and crisis composure.",
    themeColor: "#2d3436",
    primaryAgentId: "marc-glaf-security",
    companyId: "galeries-lafayette",
    estimatedMinutes: 16,
    levels: [
      {
        id: "glaf-sec-l1",
        order: 1,
        title: "Bag check",
        subtitle: "Request inspection with respect",
        status: "playable",
        agentId: "marc-glaf-security",
        room: {
          openingLine: {
            text: "Bonsoir. Routine bag check at the cosmetics hall — stay firm but courteous.",
            hint: "Professional bag inspection request",
          },
          goal: "Conduct a respectful bag check",
          meterLabel: "Compliance",
          winMessage: "Clean, professional, zero escalation.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-sec-l2",
        order: 2,
        title: "Shoplifter",
        subtitle: "Discreet approach",
        status: "playable",
        agentId: "marc-glaf-security",
        room: {
          customPersonaOverlay:
            "SCENARIO: Suspected shoplifting near designer handbags. Approach discreetly, offer assistance first. Goal: de-escalate and recover merchandise without scene.",
          goal: "Handle suspicion without public confrontation",
          meterLabel: "Discretion",
          winMessage: "Handled with the quiet confidence Galeries expects.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-sec-l3",
        order: 3,
        title: "Evacuation",
        subtitle: "Guide guests to safety",
        status: "playable",
        agentId: "marc-glaf-security",
        room: {
          customPersonaOverlay:
            "SCENARIO: Fire alarm test during peak hours. Direct crowds calmly toward exits. Goal: clear instructions, no panic.",
          goal: "Lead a calm evacuation",
          meterLabel: "Crowd control",
          winMessage: "Everyone reached the assembly point safely.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-sec-l4",
        order: 4,
        title: "VIP escort",
        subtitle: "Discreet protection",
        status: "wip",
        agentId: "marc-glaf-security",
        room: {},
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-sec-l5",
        order: 5,
        title: "Night watch",
        subtitle: "After-hours patrol",
        status: "wip",
        agentId: "marc-glaf-security",
        room: {},
        passCriteria: { type: "goal" },
      },
    ],
  },
  {
    id: "glaf-satisfaction",
    title: "Customer Satisfaction",
    description:
      "Turn complaints into loyalty — listen deeply, recover the moment, and protect the Galeries name.",
    themeColor: "#e17055",
    primaryAgentId: "amelie-glaf-satisfaction",
    companyId: "galeries-lafayette",
    estimatedMinutes: 15,
    levels: [
      {
        id: "glaf-csat-l1",
        order: 1,
        title: "Listen first",
        subtitle: "A frustrated client at the desk",
        status: "playable",
        agentId: "amelie-glaf-satisfaction",
        room: {
          openingLine: {
            text: "A client waited forty minutes for click-and-collect. They're upset. Your turn at the desk.",
            hint: "Empathetic opening without defensiveness",
          },
          goal: "Acknowledge the frustration sincerely",
          meterLabel: "Empathy",
          winMessage: "They feel heard — the temperature just dropped.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-csat-l2",
        order: 2,
        title: "Recover",
        subtitle: "Offer a meaningful fix",
        status: "playable",
        agentId: "amelie-glaf-satisfaction",
        room: {
          customPersonaOverlay:
            "SCENARIO: Client received wrong size. Offer solution: exchange, gift card, or personal shopper callback. Goal: tangible recovery they accept.",
          goal: "Propose a recovery the client accepts",
          meterLabel: "Resolution",
          winMessage: "Crisis turned into a story they'll tell friends.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-csat-l3",
        order: 3,
        title: "Loyalty",
        subtitle: "Invite them back under the dome",
        status: "playable",
        agentId: "amelie-glaf-satisfaction",
        room: {
          customPersonaOverlay:
            "SCENARIO: Issue resolved. Close with warmth and an invitation to the restaurant or personal styling. Goal: leave them proud to be Galeries clients.",
          goal: "End on a note of genuine care",
          meterLabel: "Loyalty",
          winMessage: "Under the dome, every guest leaves shining.",
        },
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-csat-l4",
        order: 4,
        title: "Online review",
        subtitle: "Respond to public feedback",
        status: "wip",
        agentId: "amelie-glaf-satisfaction",
        room: {},
        passCriteria: { type: "goal" },
      },
      {
        id: "glaf-csat-l5",
        order: 5,
        title: "Team debrief",
        subtitle: "Coach floor staff",
        status: "wip",
        agentId: "amelie-glaf-satisfaction",
        room: {},
        passCriteria: { type: "goal" },
      },
    ],
  },
]

export function getTrack(id: string): LearningTrack {
  const track = TRACKS.find((t) => t.id === id)
  if (!track) throw new Error(`Unknown track: ${id}`)
  return track
}

export function getTrackLevel(trackId: string, levelId: string): TrackLevel {
  const track = getTrack(trackId)
  const level = track.levels.find((l) => l.id === levelId)
  if (!level) throw new Error(`Unknown level: ${levelId}`)
  return level
}

export function getTrackAgent(track: LearningTrack): VoiceAgent {
  return getAgent(track.primaryAgentId)
}

export function getPlayableLevels(track: LearningTrack): TrackLevel[] {
  return track.levels.filter((l) => l.status === "playable")
}

export function countPlayableLevels(track: LearningTrack): number {
  return getPlayableLevels(track).length
}

export function isGestureLevel(level: TrackLevel): boolean {
  return level.passCriteria.type === "gesture"
}

export function getTracksByCompany(companyId: string): LearningTrack[] {
  return TRACKS.filter((t) => t.companyId === companyId)
}
