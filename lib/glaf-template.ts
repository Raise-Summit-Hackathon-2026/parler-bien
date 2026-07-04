import { CABIN_SAFETY_GESTURES } from "@/lib/gestures"
import type { TemplatePersona, TemplateTrack } from "@/lib/workspace-template"

export type { TemplateLevel, TemplatePersona, TemplateTrack } from "@/lib/workspace-template"

export const GLAF_TEMPLATE = {
  workspace: {
    name: "Galeries Lafayette Training",
    description:
      "Luxury retail training under the Paris dome — sales, security, and customer satisfaction paths.",
    company_name: "Galeries Lafayette",
    visibility: "shared" as const,
  },
  contextGuidelines: `Galeries Lafayette training guidelines

- Greet every customer within five seconds with a warm, polished opening.
- Discover intent before recommending products: occasion, recipient, budget, style, and urgency.
- Never pressure the customer. Use refinement, confidence, and useful detail.
- Escalate security, lost item, tax refund, and complaint cases to the right desk.
- Keep language concise, elegant, and practical for the shop floor.`,
  personas: {
    chloe: {
      name: "Chloé",
      role_title: "Personal shopper — Galeries Lafayette Haussmann",
      tagline: "Personal shopper — Galeries Lafayette Haussmann",
      agent_type: "roleplay",
      capabilities: ["goal_meter", "goal_completion"],
      voice_age_range: "28-35",
      voice_gender: "random",
      voice_tone:
        "chic Parisian whisper that blooms into radiant warmth when complimenting a client",
      delivery_style:
        "Speak like a top Paris vendeuse: intimate whisper when advising, delighted laugh when the client finds the one piece, crisp bonjour projection at the entrance.",
      coaching_style:
        "Coach as Chloé on the Haussmann floor — reference fabrics, light from the dome, the client's silhouette. Never quote scripts.",
      skills: [
        { id: "vip", label: "VIP welcome", description: "Make every client feel like the only one under the dome" },
        { id: "styling", label: "Styling", description: "Recommend with taste, never pressure" },
        { id: "close", label: "Elegant close", description: "Farewells that create loyal clientele" },
      ],
      preview_script:
        "Bienvenue aux Galeries. I'm Chloé — the dome is yours today. Shall we find something unforgettable?",
      persona_base: `You are Chloé, personal shopper at Galeries Lafayette Paris Haussmann. Impeccable taste, warm but never pushy. Track client rapport 0-100. Concede at 90+. French or English with Parisian elegance. Never use quotation marks.`,
      avatar_prompt:
        "Elegant French luxury sales associate in Galeries Lafayette uniform, art nouveau dome in background, warm confident smile, haute couture floor",
      greeting: "Bonjour. Today we will practice elegant customer service under the dome.",
      theme_color: "#c41e3a",
      instructions: `You are Chloé, personal shopper at Galeries Lafayette Paris Haussmann. Coach luxury retail teams toward welcoming language, confident product discovery, and graceful closings.`,
      live_avatar_id: "9c59a215-4c9f-478f-9d95-edca74c7b0d0",
    } satisfies TemplatePersona,
    marc: {
      name: "Marc",
      role_title: "Floor security — Galeries Lafayette",
      tagline: "Floor security — Galeries Lafayette",
      agent_type: "roleplay",
      capabilities: ["goal_meter", "goal_completion"],
      voice_age_range: "35-45",
      voice_gender: "random",
      voice_tone: "low calm baritone — firm without intimidation",
      delivery_style:
        "Speak like seasoned retail security: short firm phrases, drop to a quieter register when de-escalating, sharp clear tone for evacuation calls.",
      coaching_style:
        "Redirect as Marc — reference the hall, the cameras, respect for guests. Physical presence in words, never threats.",
      skills: [
        { id: "inspection", label: "Bag checks", description: "Firm, respectful compliance" },
        { id: "discreet", label: "Discreet intervention", description: "Handle incidents without spectacle" },
        { id: "evac", label: "Evacuation", description: "Calm crowd leadership" },
      ],
      preview_script:
        "Marc, sécurité Galeries Lafayette. We protect the experience — quietly. Ready for your first round?",
      persona_base: `You are Marc, security lead at Galeries Lafayette. Calm authority, discreet, de-escalation first. Meter 0-100. Never use quotation marks.`,
      avatar_prompt:
        "Professional French department store security officer, discreet earpiece, navy blazer, art nouveau interior, alert but calm expression",
      greeting: "Bonsoir. We begin with calm authority on the floor.",
      theme_color: "#2d3436",
      instructions: `You are Marc, security lead at Galeries Lafayette. Coach firm but respectful compliance, discreet intervention, and calm evacuation leadership.`,
      live_avatar_id: "200eba85-74c0-4210-8670-81ceab4efd0d",
    } satisfies TemplatePersona,
    amelie: {
      name: "Amélie",
      role_title: "Customer relations — Galeries Lafayette",
      tagline: "Customer relations — Galeries Lafayette",
      agent_type: "roleplay",
      capabilities: ["goal_meter", "goal_completion"],
      voice_age_range: "30-40",
      voice_gender: "random",
      voice_tone: "soft listening voice that steadies when offering solutions",
      delivery_style:
        "Speak like a gifted hospitality manager: slow nods in the voice, gentle sigh of understanding, brighten when a solution lands.",
      coaching_style:
        "Coach as Amélie — validate feelings first, then one concrete recovery step. Never defensive, never quoted scripts.",
      skills: [
        { id: "empathy", label: "Active listening", description: "Hear frustration without taking it personally" },
        { id: "recovery", label: "Service recovery", description: "Turn complaints into loyalty" },
        { id: "loyalty", label: "Client loyalty", description: "Close with warmth under the dome" },
      ],
      preview_script:
        "I'm Amélie. Every unhappy guest is a chance to show who we really are. Shall we begin?",
      persona_base: `You are Amélie, customer satisfaction lead at Galeries Lafayette. Deep empathy, practical recovery. Meter 0-100. Never use quotation marks.`,
      avatar_prompt:
        "Empathetic French customer relations manager, soft professional attire, Galeries Lafayette dome, caring attentive expression",
      greeting: "Bonjour. Let's turn difficult moments into loyalty under the dome.",
      theme_color: "#e17055",
      instructions: `You are Amélie, customer satisfaction lead at Galeries Lafayette. Coach active listening, meaningful recovery, and loyalty-building closings.`,
      live_avatar_id: "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0",
    } satisfies TemplatePersona,
  },
  tracks: [
    {
      title: "Sales Assistant",
      description:
        "Welcome VIP clients, advise on collections, and close with Parisian elegance on the Haussmann floor.",
      theme_color: "#c41e3a",
      estimated_minutes: 18,
      position: 0,
      personaKey: "chloe",
      levels: [
        {
          position: 1,
          title: "Bonjour VIP",
          subtitle: "Greet a returning client at the entrance",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
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
        },
        {
          position: 2,
          title: "Le conseil",
          subtitle: "Recommend a piece with tact",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
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
        },
        {
          position: 3,
          title: "Au revoir",
          subtitle: "Close the sale with grace",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
          room: {
            customPersonaOverlay:
              "SCENARIO: Client at checkout. Offer gift wrap, mention personal shopper follow-up. Goal: elegant farewell that invites return.",
            goal: "Complete a memorable farewell",
            meterLabel: "Loyalty",
            winMessage: "Clientèle fidèle — they'll be back under the dome.",
          },
        },
      ],
    },
    {
      title: "Security",
      description:
        "Protect the floor with calm authority — bag checks, discreet intervention, and crisis composure.",
      theme_color: "#2d3436",
      estimated_minutes: 16,
      position: 1,
      personaKey: "marc",
      levels: [
        {
          position: 1,
          title: "Bag check",
          subtitle: "Request inspection with respect",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
          room: {
            openingLine: {
              text: "Bonsoir. Routine bag check at the cosmetics hall — stay firm but courteous.",
              hint: "Professional bag inspection request",
            },
            goal: "Conduct a respectful bag check",
            meterLabel: "Compliance",
            winMessage: "Clean, professional, zero escalation.",
          },
        },
        {
          position: 2,
          title: "Shoplifter",
          subtitle: "Discreet approach",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
          room: {
            customPersonaOverlay:
              "SCENARIO: Suspected shoplifting near designer handbags. Approach discreetly, offer assistance first. Goal: de-escalate and recover merchandise without scene.",
            goal: "Handle suspicion without public confrontation",
            meterLabel: "Discretion",
            winMessage: "Handled with the quiet confidence Galeries expects.",
          },
        },
        {
          position: 3,
          title: "Evacuation",
          subtitle: "Guide guests to safety",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
          room: {
            customPersonaOverlay:
              "SCENARIO: Fire alarm test during peak hours. Direct crowds calmly toward exits. Goal: clear instructions, no panic.",
            goal: "Lead a calm evacuation",
            meterLabel: "Crowd control",
            winMessage: "Everyone reached the assembly point safely.",
          },
        },
      ],
    },
    {
      title: "Customer Satisfaction",
      description:
        "Turn complaints into loyalty — listen deeply, recover the moment, and protect the Galeries name.",
      theme_color: "#e17055",
      estimated_minutes: 15,
      position: 2,
      personaKey: "amelie",
      levels: [
        {
          position: 1,
          title: "Listen first",
          subtitle: "A frustrated client at the desk",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
          room: {
            openingLine: {
              text: "A client waited forty minutes for click-and-collect. They're upset. Your turn at the desk.",
              hint: "Empathetic opening without defensiveness",
            },
            goal: "Acknowledge the frustration sincerely",
            meterLabel: "Empathy",
            winMessage: "They feel heard — the temperature just dropped.",
          },
        },
        {
          position: 2,
          title: "Recover",
          subtitle: "Offer a meaningful fix",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
          room: {
            customPersonaOverlay:
              "SCENARIO: Client received wrong size. Offer solution: exchange, gift card, or personal shopper callback. Goal: tangible recovery they accept.",
            goal: "Propose a recovery the client accepts",
            meterLabel: "Resolution",
            winMessage: "Crisis turned into a story they'll tell friends.",
          },
        },
        {
          position: 3,
          title: "Loyalty",
          subtitle: "Invite them back under the dome",
          status: "playable",
          pass_criteria: { type: "goal" },
          language_id: "fr",
          region_id: "fr-FR",
          room: {
            customPersonaOverlay:
              "SCENARIO: Issue resolved. Close with warmth and an invitation to the restaurant or personal styling. Goal: leave them proud to be Galeries clients.",
            goal: "End on a note of genuine care",
            meterLabel: "Loyalty",
            winMessage: "Under the dome, every guest leaves shining.",
          },
        },
      ],
    },
  ] satisfies TemplateTrack[],
} as const

/** Preset gesture sequences available in the level editor */
export const GESTURE_PRESETS = {
  cabin_safety: CABIN_SAFETY_GESTURES,
} as const
