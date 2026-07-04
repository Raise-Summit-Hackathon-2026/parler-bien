/**
 * Laugh taxonomy + reference clips for Rich Laugher Trainer.
 *
 * Types synthesize research taxonomies (not a single ground-truth dataset label set):
 * - Tanaka & Campbell (2014): polite vs mirthful conversational laughs
 * - SMILE-Next / Tanaka (2024): mirthful, polite, satirical
 * - Jokinen & Hiovan: mirth, embarrassed, polite, derision, relief (+ breath as form)
 * - VocalSound (Gong et al., ICASSP 2022): 21k crowdsourced laughter recordings (CC BY-SA)
 * - ehehe-corpus (Hugging Face): 16k studio voice-actor laughs (gated, not bundled)
 *
 * Audio files in /public/laughs are CC0 / public domain from Wikimedia Commons (PDSounds, Freesound transfers).
 */

export type LaughTypeId =
  | "mirthful"
  | "polite"
  | "satirical"
  | "nervous"
  | "derisive"
  | "old_money"
  | "try_hard"

export type LaughReferenceClip = {
  id: string
  laughTypeId: LaughTypeId
  title: string
  description: string
  /** Path under /public */
  audioSrc: string
  durationSeconds: number
  attribution: string
  /** Target overall_score band when practicing this archetype in Rich Laugher mode */
  targetScoreMin: number
  targetScoreMax: number
}

export type LaughType = {
  id: LaughTypeId
  label: string
  emoji: string
  summary: string
  acousticCues: string[]
  richLaugherVerdict: string
  researchNote: string
}

export const LAUGH_TYPES: LaughType[] = [
  {
    id: "mirthful",
    label: "Mirthful",
    emoji: "😂",
    summary: "Spontaneous, joyful — you actually think it's funny.",
    acousticCues: ["Longer bouts", "More vocal bursts", "Higher arousal", "Variable pitch"],
    richLaugherVerdict: "Too sincere for the yacht club. Save it for your friends.",
    researchNote: "SMILE-Next / Tanaka: spontaneous mirthful laughter",
  },
  {
    id: "polite",
    label: "Polite",
    emoji: "🙂",
    summary: "Social lubricant — you don't mean it, but you're being nice.",
    acousticCues: ["Shorter", "Breathier", "Lower intensity", "Often nasal grunts"],
    richLaugherVerdict: "Acceptable at galas. Still slightly peasant if overused.",
    researchNote: "Tanaka & Campbell (2014): polite formal laughs in conversation",
  },
  {
    id: "satirical",
    label: "Satirical",
    emoji: "😏",
    summary: "Awkward, mocking, or performatively unimpressed.",
    acousticCues: ["Sharp onset", "Uneven rhythm", "Social distance signal"],
    richLaugherVerdict: "Dangerous at charity dinners. Use sparingly.",
    researchNote: "SMILE-Next: satirical / socially distant laughter",
  },
  {
    id: "nervous",
    label: "Nervous",
    emoji: "😅",
    summary: "Embarrassed filler — tension release, not amusement.",
    acousticCues: ["Snorts", "Staccato bursts", "Pitch spikes", "Trailing off"],
    richLaugherVerdict: "Instant nouveau-riche tell. Breathe through the nose instead.",
    researchNote: "Jokinen & Hiovan: embarrassed / relief laughter",
  },
  {
    id: "derisive",
    label: "Derisive",
    emoji: "😈",
    summary: "Dominance laugh — you're winning, they're losing.",
    acousticCues: ["Loud", "Sustained", "Chest resonance", "Theatrical"],
    richLaugherVerdict: "Only valid if you inherited the building.",
    researchNote: "Pragmatic function: dominance / norm enforcement (Wood & Niedenthal)",
  },
  {
    id: "old_money",
    label: "Old Money",
    emoji: "🥂",
    summary: "Brief, controlled, through-the-nose — you've heard better.",
    acousticCues: ["<2s", "Low volume", "Closed mouth", "Single exhale chuckle"],
    richLaugherVerdict: "Yacht-ready. The coach nods once and looks away.",
    researchNote: "App archetype inspired by polite/restrained acoustic profiles",
  },
  {
    id: "try_hard",
    label: "Try-Hard",
    emoji: "🤡",
    summary: "Performative, cartoonish — you're selling the laugh.",
    acousticCues: ["Forced rhythm", "Too many ha's", "Broadcast volume", "No breath control"],
    richLaugherVerdict: "Malibu real estate seminar energy. Stop.",
    researchNote: "Volitional vs spontaneous distinction (Bryant et al.)",
  },
]

export const LAUGH_REFERENCE_CLIPS: LaughReferenceClip[] = [
  {
    id: "restrained-ha",
    laughTypeId: "old_money",
    title: "Restrained “ha ha”",
    description: "Two syllables, minimal commitment — peak old money.",
    audioSrc: "/laughs/restrained-ha.ogg",
    durationSeconds: 2,
    attribution: "Wikimedia Commons · En-uk-Ha ha.ogg (CC0)",
    targetScoreMin: 85,
    targetScoreMax: 98,
  },
  {
    id: "brief-chuckle",
    laughTypeId: "old_money",
    title: "Brief chuckle",
    description: "Short, single burst — controlled exhale.",
    audioSrc: "/laughs/brief-chuckle.wav",
    durationSeconds: 1,
    attribution: "Wikimedia Commons · Short clip of girl laughing.wav (CC0)",
    targetScoreMin: 80,
    targetScoreMax: 95,
  },
  {
    id: "polite-giggle",
    laughTypeId: "polite",
    title: "Polite giggle",
    description: "Light social laugh — acceptable at brunch.",
    audioSrc: "/laughs/polite-giggle.ogg",
    durationSeconds: 7,
    attribution: "Wikimedia Commons · Giggle.ogg (CC0)",
    targetScoreMin: 65,
    targetScoreMax: 82,
  },
  {
    id: "social-group",
    laughTypeId: "polite",
    title: "Group polite laugh",
    description: "Audience reaction — socially motivated, not personal joy.",
    audioSrc: "/laughs/social-group.ogg",
    durationSeconds: 6,
    attribution: "Wikimedia Commons · Small group laughter.ogg (CC0)",
    targetScoreMin: 55,
    targetScoreMax: 75,
  },
  {
    id: "mirthful-burst",
    laughTypeId: "mirthful",
    title: "Bursting out laughing",
    description: "Can't hold it in — genuine mirth (too much for a trustee dinner).",
    audioSrc: "/laughs/mirthful-burst.ogg",
    durationSeconds: 15,
    attribution: "Wikimedia Commons · Bursting out laughing.ogg (PDSounds / CC0)",
    targetScoreMin: 25,
    targetScoreMax: 55,
  },
  {
    id: "spontaneous-laugh",
    laughTypeId: "mirthful",
    title: "Spontaneous laugh",
    description: "Natural conversational mirth — long and unguarded.",
    audioSrc: "/laughs/spontaneous-laugh.ogg",
    durationSeconds: 16,
    attribution: "Wikimedia Commons · Laughter.ogg (PDSounds / CC0)",
    targetScoreMin: 20,
    targetScoreMax: 50,
  },
  {
    id: "nervous-snort",
    laughTypeId: "nervous",
    title: "Nervous snorts",
    description: "Anxiety leaks — staccato snorts and giggles.",
    audioSrc: "/laughs/nervous-snort.ogg",
    durationSeconds: 22,
    attribution: "Wikimedia Commons · Short male snorts and giggles.ogg (CC0)",
    targetScoreMin: 10,
    targetScoreMax: 35,
  },
  {
    id: "satirical-evil",
    laughTypeId: "satirical",
    title: "Satirical / evil",
    description: "Performative dominance — cartoon villain energy.",
    audioSrc: "/laughs/satirical-evil.ogg",
    durationSeconds: 11,
    attribution: "Wikimedia Commons · Evil laugh.ogg (CC0)",
    targetScoreMin: 15,
    targetScoreMax: 40,
  },
  {
    id: "tryhard-cartoon",
    laughTypeId: "try_hard",
    title: "Cartoon try-hard",
    description: "Selling the laugh — Krusty impression levels of commitment.",
    audioSrc: "/laughs/tryhard-cartoon.ogg",
    durationSeconds: 2,
    attribution: "Wikimedia Commons · Krusty laugh impression.ogg (CC0)",
    targetScoreMin: 5,
    targetScoreMax: 25,
  },
]

export const LAUGH_DATASET_SOURCES = [
  {
    name: "VocalSound",
    size: "21,024 recordings · 3,365 speakers",
    license: "CC BY-SA 4.0",
    url: "https://github.com/YuanGongND/vocalsound",
    note: "Crowdsourced laughter/cough/etc. — class labels, not laugh subtypes.",
  },
  {
    name: "ehehe-corpus",
    size: "16,415 studio laughs · 350 voice actors",
    license: "Gated (HF)",
    url: "https://huggingface.co/datasets/litagin/ehehe-corpus",
    note: "High-quality acted laughs with Whisper transcripts — best for ML, not bundled here.",
  },
  {
    name: "SMILE-Next taxonomy",
    size: "mirthful · polite · satirical",
    license: "Research",
    url: "https://arxiv.org/html/2605.28084v1",
    note: "Multimodal laughter reasoning benchmark.",
  },
]

export function getLaughType(id: LaughTypeId): LaughType {
  const found = LAUGH_TYPES.find((t) => t.id === id)
  if (!found) throw new Error(`Unknown laugh type: ${id}`)
  return found
}

export function getClipsForType(laughTypeId: LaughTypeId): LaughReferenceClip[] {
  return LAUGH_REFERENCE_CLIPS.filter((c) => c.laughTypeId === laughTypeId)
}

export function getOldMoneyReferenceClips(): LaughReferenceClip[] {
  return LAUGH_REFERENCE_CLIPS.filter((c) => c.laughTypeId === "old_money")
}

export function getAntiPatternClips(): LaughReferenceClip[] {
  return LAUGH_REFERENCE_CLIPS.filter((c) =>
    ["try_hard", "nervous", "mirthful", "satirical"].includes(c.laughTypeId),
  )
}
