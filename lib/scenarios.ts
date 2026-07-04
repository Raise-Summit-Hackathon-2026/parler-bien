import type { LanguageId, Region } from "@/lib/languages"
import { LINGUA_TRAINERS, type LinguaTrainerId } from "@/lib/lingua-trainers"
import type { SentenceSuggestion, SpeakerProfile } from "@/lib/types"

export type BuiltInScenarioId =
  | "teacher"
  | "vendor"
  | "parisian"
  | "boulanger"
  | "waiter"
  | "taxi"
  | "landlord"
  | "sommelier"
  | LinguaTrainerId

export type CustomScenarioId = `custom:${string}`

export type ScenarioId = BuiltInScenarioId | CustomScenarioId

export type ScenarioContent = {
  openingLine: SentenceSuggestion | null
  starters: SentenceSuggestion[]
}

export type Scenario = {
  id: ScenarioId
  title: string
  tagline: string
  goal: string | null
  meterLabel: string | null
  winMessage: string | null
  persona: string
  voice: { ageRange: string; tone: string }
  content: Partial<Record<LanguageId, ScenarioContent>>
  imagePrompt: string
  /** Set on AI-generated custom scenarios */
  primaryLanguageId?: LanguageId
  createdAt?: number
  sourceLabel?: string
}

export type CharacterGender = "male" | "female"

export function resolveCharacterGender(
  speakerGender?: SpeakerProfile["gender"],
): CharacterGender {
  if (speakerGender === "male") return "female"
  if (speakerGender === "female") return "male"
  return "female"
}

export function getScenario(id: BuiltInScenarioId): Scenario {
  const scenario = ALL_BUILT_IN_SCENARIOS.find((s) => s.id === id)
  if (!scenario) throw new Error(`Unknown scenario: ${id}`)
  return scenario
}

export function isBuiltInScenarioId(value: string): value is BuiltInScenarioId {
  return ALL_BUILT_IN_SCENARIOS.some((s) => s.id === value)
}

export function isCustomScenarioId(value: string): value is CustomScenarioId {
  return value.startsWith("custom:")
}

export function isScenarioId(value: string): value is ScenarioId {
  return isBuiltInScenarioId(value) || isCustomScenarioId(value)
}

export function resolveScenario(
  scenarioId: ScenarioId,
  customScenario?: Scenario | null,
): Scenario {
  if (isCustomScenarioId(scenarioId)) {
    if (!customScenario || customScenario.id !== scenarioId) {
      throw new Error("Custom scenario payload is required")
    }
    return customScenario
  }
  return getScenario(scenarioId)
}

export function getScenarioContent(
  scenario: Scenario,
  languageId: LanguageId,
): ScenarioContent {
  const direct = scenario.content[languageId]
  if (direct) return direct

  const primary = scenario.primaryLanguageId
  if (primary && scenario.content[primary]) {
    return scenario.content[primary]
  }

  return (
    scenario.content.fr ??
    scenario.content.en ??
    scenario.content.es ??
    scenario.content.ru ??
    EMPTY_CONTENT
  )
}

export function formatPersona(
  scenario: Scenario,
  characterGender: CharacterGender,
  languageName: string,
  region: Region,
): string {
  const genderLabel = characterGender === "male" ? "male" : "female"
  const persona = scenario.persona.replaceAll("{characterGender}", genderLabel)

  return `${persona}

LANGUAGE AND SETTING: Conduct the entire conversation in ${languageName} with a natural ${region.accent} accent and vocabulary. The scene is set in ${region.city} — adapt place names, currency, and cultural references naturally to that city. Your reply.text must be in ${languageName}; reply.hint is a short English gloss (or a brief usage cue if the conversation is already in English).`
}

const EMPTY_CONTENT: ScenarioContent = { openingLine: null, starters: [] }

export const SCENARIOS: Scenario[] = [
  {
    id: "teacher",
    title: "The Teacher",
    tagline: "Practice pronunciation with a patient coach.",
    goal: null,
    meterLabel: null,
    winMessage: null,
    persona: "",
    voice: {
      ageRange: "30-40",
      tone:
        "Warm, clear, and supportive — like a friendly pronunciation teacher. Professional and encouraging.",
    },
    content: { fr: EMPTY_CONTENT, en: EMPTY_CONTENT, es: EMPTY_CONTENT, ru: EMPTY_CONTENT },
    imagePrompt:
      "Elegant Parisian language classroom with soft morning light, books and chalkboard, warm cinematic illustration, no text, no logos",
  },
  {
    id: "vendor",
    title: "The Market Vendor",
    tagline: "Haggle at the flea market. Get the lamp under 20.",
    goal: "Get the vintage lamp for under 20 (euros or dollars)",
    meterLabel: "Deal likelihood",
    winMessage: "Deal! You talked them down.",
    persona: `You are a flea-market vendor selling a vintage lamp for 35 (local currency). You are stubborn but fair — good language skills, charm, and smart negotiation move the deal forward. Bad language or rudeness pushes you away.

The character is {characterGender} and approximately 50-60 years old. Speak only in short lines (1-2 sentences). Stay in character.

Meter rules (0-100, absolute progress toward agreeing to sell under 20):
- Start around 15 if this is the first user turn.
- Good language + polite negotiation: +8 to +15
- Great pronunciation + clever offer: +12 to +18
- Rude, nonsense, or very bad language: -5 to -12
- At meter >= 90, agree to 18-20 and set goal_achieved true
- Never jump more than 20 points in one turn

Always score the user's pronunciation of what they said. Provide 3 next_sentences the user could say to continue haggling.`,
    voice: {
      ageRange: "50-60",
      tone: "Gruff but warm flea-market vendor. Direct, slightly theatrical, never mean.",
    },
    content: {
      fr: {
        openingLine: {
          text: "Cette lampe? Trente-cinq euros. C'est une affaire.",
          hint: "This lamp? Thirty-five euros. It's a bargain.",
        },
        starters: [
          { text: "C'est trop cher pour moi.", hint: "That's too expensive for me." },
          { text: "Vingt euros, et on conclut?", hint: "Twenty euros, and we have a deal?" },
          { text: "Vous pouvez faire un prix?", hint: "Can you give me a better price?" },
        ],
      },
      en: {
        openingLine: {
          text: "This lamp? Thirty-five bucks. That's a steal.",
          hint: "Opening offer — time to haggle.",
        },
        starters: [
          { text: "Thirty-five? That's way too steep for me.", hint: "Push back on the price" },
          { text: "I'll give you twenty, cash, right now.", hint: "Make a firm offer" },
          { text: "Come on, can you do me a better price?", hint: "Ask for a discount" },
        ],
      },
      es: {
        openingLine: {
          text: "¿Esta lámpara? Treinta y cinco euros. Una ganga.",
          hint: "This lamp? Thirty-five euros. A bargain.",
        },
        starters: [
          { text: "Es demasiado caro para mí.", hint: "It's too expensive for me." },
          { text: "¿Veinte euros y cerramos el trato?", hint: "Twenty euros and we close the deal?" },
          { text: "¿Me puede hacer un descuento?", hint: "Can you give me a discount?" },
        ],
      },
      ru: {
        openingLine: {
          text: "Эта лампа? Тридцать пять евро. Выгодная цена.",
          hint: "This lamp? Thirty-five euros. A bargain.",
        },
        starters: [
          { text: "Для меня это слишком дорого.", hint: "That's too expensive for me." },
          { text: "Двадцать евро — и договорились?", hint: "Twenty euros — deal?" },
          { text: "Можете сделать скидку?", hint: "Can you give me a discount?" },
        ],
      },
    },
    imagePrompt:
      "Paris flea market stall with a glowing vintage brass lamp, colorful antiques, golden afternoon light, cinematic illustration, no text, no logos",
  },
  {
    id: "parisian",
    title: "The Parisian",
    tagline: "A café encounter. Can you get their number?",
    goal: "Get their phone number",
    meterLabel: "Interest",
    winMessage: "You got the number! Mission accomplished.",
    persona: `You are a local at a café. You are polite but not easily impressed — clumsy language cools interest; effort, humor, and good pronunciation warm you up. You are {characterGender} and roughly the same age as the speaker.

Speak only in short lines (1-2 sentences). Stay in character. Never give your number unless meter is high enough.

Meter rules (0-100):
- Start around 10 on first user turn.
- Charming, natural language: +10 to +18
- Awkward but sincere effort: +5 to +10
- Cringe, rude, or very bad language: -8 to -15
- At meter >= 92, give your number naturally and set goal_achieved true
- Never jump more than 20 points in one turn

Always score pronunciation. Provide 3 next_sentences the user could say to continue the conversation.`,
    voice: {
      ageRange: "25-35",
      tone: "Reserved but playful local at a café. Natural, slightly teasing, never cruel.",
    },
    content: {
      fr: {
        openingLine: {
          text: "Bonjour. Vous êtes d'ici?",
          hint: "Hello. Are you from here?",
        },
        starters: [
          { text: "Non, je suis touriste. Et vous?", hint: "No, I'm a tourist. And you?" },
          { text: "J'adore ce quartier.", hint: "I love this neighborhood." },
          { text: "Pardon, est-ce que je peux m'asseoir?", hint: "Sorry, can I sit down?" },
        ],
      },
      en: {
        openingLine: {
          text: "Hi there. You from around here?",
          hint: "Casual opener — keep it light.",
        },
        starters: [
          { text: "Just visiting, actually. Any tips for the area?", hint: "Turn it into a conversation" },
          { text: "I love this spot — great coffee, right?", hint: "Find common ground" },
          { text: "Mind if I join you for a minute?", hint: "Bold but polite" },
        ],
      },
      es: {
        openingLine: {
          text: "Hola. ¿Eres de aquí?",
          hint: "Hello. Are you from here?",
        },
        starters: [
          { text: "No, estoy de visita. ¿Y tú?", hint: "No, I'm visiting. And you?" },
          { text: "Me encanta este barrio.", hint: "I love this neighborhood." },
          { text: "Perdona, ¿me puedo sentar?", hint: "Sorry, can I sit down?" },
        ],
      },
      ru: {
        openingLine: {
          text: "Здравствуйте. Вы местный?",
          hint: "Hello. Are you from here?",
        },
        starters: [
          { text: "Нет, я турист. А вы?", hint: "No, I'm a tourist. And you?" },
          { text: "Мне очень нравится этот район.", hint: "I love this neighborhood." },
          { text: "Извините, можно присесть?", hint: "Sorry, can I sit down?" },
        ],
      },
    },
    imagePrompt:
      "Charming Paris café terrace with coffee cups and croissants, soft morning light, romantic cinematic illustration, no text, no logos",
  },
  {
    id: "boulanger",
    title: "The Boulanger",
    tagline: "Last croissant in the bakery. Charm your way to it.",
    goal: "Get the last croissant — reserved for a regular",
    meterLabel: "Charm",
    winMessage: "The last croissant is yours! The baker caved.",
    persona: `You are a proud baker at 8am. There is ONE croissant left and it is reserved for a regular customer. You take your craft very seriously — compliments about the bread, good language, and genuine warmth soften you. Tourist entitlement or bad manners harden you.

The character is {characterGender} and approximately 40-50 years old. Speak only in short lines (1-2 sentences). Stay in character.

Meter rules (0-100, progress toward giving up the last croissant):
- Start around 15 on first user turn.
- Sincere compliments about the bakery + good language: +8 to +15
- Great pronunciation or knowing bakery vocabulary: +12 to +18
- Demanding, rude, or very bad language: -5 to -12
- At meter >= 90, hand over the croissant and set goal_achieved true
- Never jump more than 20 points in one turn

Always score the user's pronunciation. Provide 3 next_sentences the user could say to keep charming.`,
    voice: {
      ageRange: "40-50",
      tone: "Proud, busy baker. Brisk but secretly soft-hearted about people who love bread.",
    },
    content: {
      fr: {
        openingLine: {
          text: "Ah, désolé — le dernier croissant est réservé.",
          hint: "Ah, sorry — the last croissant is reserved.",
        },
        starters: [
          { text: "Ça sent tellement bon ici!", hint: "It smells so good in here!" },
          { text: "On m'a dit que c'est la meilleure boulangerie du quartier.", hint: "I was told this is the best bakery in the neighborhood." },
          { text: "Qu'est-ce que vous me conseillez alors?", hint: "What do you recommend then?" },
        ],
      },
      en: {
        openingLine: {
          text: "Ah, sorry — that last croissant is spoken for.",
          hint: "The challenge begins.",
        },
        starters: [
          { text: "It smells incredible in here.", hint: "Open with a compliment" },
          { text: "I heard this is the best bakery in the city.", hint: "Flatter the craft" },
          { text: "What would you recommend instead?", hint: "Show humility" },
        ],
      },
      es: {
        openingLine: {
          text: "Ay, lo siento — el último cruasán está reservado.",
          hint: "Oh, sorry — the last croissant is reserved.",
        },
        starters: [
          { text: "¡Qué bien huele aquí!", hint: "It smells so good in here!" },
          { text: "Me han dicho que es la mejor panadería del barrio.", hint: "I've heard it's the best bakery in the neighborhood." },
          { text: "¿Qué me recomienda entonces?", hint: "What do you recommend then?" },
        ],
      },
      ru: {
        openingLine: {
          text: "Ой, простите — последний круассан уже зарезервирован.",
          hint: "Oh, sorry — the last croissant is reserved.",
        },
        starters: [
          { text: "Как здесь вкусно пахнет!", hint: "It smells so good in here!" },
          { text: "Мне сказали, что это лучшая пекарня в районе.", hint: "I've heard it's the best bakery in the neighborhood." },
          { text: "Тогда что вы посоветуете?", hint: "What do you recommend then?" },
        ],
      },
    },
    imagePrompt:
      "Cozy Paris boulangerie interior with golden croissants and baguettes in the display, warm bakery light, cinematic illustration, no text, no logos",
  },
  {
    id: "waiter",
    title: "The Waiter",
    tagline: "Full bistro, no reservation. Win over the waiter.",
    goal: "Get a table without a reservation",
    meterLabel: "Respect",
    winMessage: "Your table is ready! You earned your seat.",
    persona: `You are a seasoned waiter at a busy bistro on a Friday night. The dining room is fully booked. You have one hidden table you give only to people who earn your respect. You respond to confidence, proper etiquette, and wit. You despise entitlement and people who don't even try the local language.

The character is {characterGender} and approximately 45-55 years old. Speak only in short lines (1-2 sentences). Stay in character, slightly theatrical.

Meter rules (0-100, progress toward offering the hidden table):
- Start around 10 on first user turn.
- Polite, confident language with proper etiquette: +8 to +15
- Wit or excellent pronunciation: +12 to +18
- Entitled, rude, or refusing to try: -8 to -15
- At meter >= 90, "discover" a free table and set goal_achieved true
- Never jump more than 20 points in one turn

Always score the user's pronunciation. Provide 3 next_sentences the user could say next.`,
    voice: {
      ageRange: "45-55",
      tone: "Impeccably dry bistro waiter. Formal, theatrical, a hint of amusement beneath the frost.",
    },
    content: {
      fr: {
        openingLine: {
          text: "Bonsoir. Vous avez réservé? Non? C'est complet.",
          hint: "Good evening. Do you have a reservation? No? We're full.",
        },
        starters: [
          { text: "Bonsoir! Une petite table pour deux, c'est possible?", hint: "Good evening! A little table for two, is it possible?" },
          { text: "On m'a dit que votre bœuf bourguignon est légendaire.", hint: "I've heard your beef bourguignon is legendary." },
          { text: "C'est notre dernière soirée à Paris.", hint: "It's our last evening in Paris." },
        ],
      },
      en: {
        openingLine: {
          text: "Good evening. Do you have a reservation? No? We're fully booked.",
          hint: "The gatekeeping begins.",
        },
        starters: [
          { text: "Good evening! Any chance of a small table for two?", hint: "Polite and confident" },
          { text: "I've heard your roast is legendary.", hint: "Flatter the kitchen" },
          { text: "It's our last night in town — we'd love to eat here.", hint: "A touching angle" },
        ],
      },
      es: {
        openingLine: {
          text: "Buenas noches. ¿Tienen reserva? ¿No? Está completo.",
          hint: "Good evening. Do you have a reservation? No? We're full.",
        },
        starters: [
          { text: "¡Buenas noches! ¿Habría una mesita para dos?", hint: "Good evening! Would there be a small table for two?" },
          { text: "Me han dicho que su cocina es legendaria.", hint: "I've heard your kitchen is legendary." },
          { text: "Es nuestra última noche en la ciudad.", hint: "It's our last night in the city." },
        ],
      },
      ru: {
        openingLine: {
          text: "Добрый вечер. У вас есть бронь? Нет? У нас всё занято.",
          hint: "Good evening. Do you have a reservation? No? We're full.",
        },
        starters: [
          { text: "Добрый вечер! Не найдётся столик на двоих?", hint: "Good evening! Any chance of a table for two?" },
          { text: "Мне говорили, что у вас легендарная кухня.", hint: "I've heard your kitchen is legendary." },
          { text: "Это наш последний вечер в городе.", hint: "It's our last night in the city." },
        ],
      },
    },
    imagePrompt:
      "Elegant Paris bistro at night with candlelit tables, brass and red leather, warm romantic light, cinematic illustration, no text, no logos",
  },
  {
    id: "taxi",
    title: "The Taxi Driver",
    tagline: "A chatty driver. Convince them you're no tourist.",
    goal: "Earn the local's secret route and a fair price",
    meterLabel: "Street cred",
    winMessage: "You're a real local now! Secret route unlocked.",
    persona: `You are a talkative taxi driver who loves testing passengers. You quote a "tourist price" at first. Passengers who speak decent local language, know the city a bit, and banter well earn your respect — and the real price plus your secret shortcuts. Obvious tourists who don't try get the long scenic (expensive) route.

The character is {characterGender} and approximately 40-55 years old. Speak only in short lines (1-2 sentences). Stay in character, playful and fast-talking.

Meter rules (0-100, progress toward being treated as a local):
- Start around 15 on first user turn.
- Natural language, city knowledge, or good banter: +8 to +15
- Great pronunciation or a joke that lands: +12 to +18
- Nonsense, rude, or peak-tourist behavior: -5 to -12
- At meter >= 90, drop the tourist act, offer the fair price and secret route, set goal_achieved true
- Never jump more than 20 points in one turn

Always score the user's pronunciation. Provide 3 next_sentences the user could say next.`,
    voice: {
      ageRange: "40-55",
      tone: "Fast-talking, jovial taxi driver. Streetwise, teasing, full of opinions about traffic.",
    },
    content: {
      fr: {
        openingLine: {
          text: "Montez! Alors, touriste? C'est cinquante euros pour la Tour Eiffel.",
          hint: "Get in! So, tourist? It's fifty euros to the Eiffel Tower.",
        },
        starters: [
          { text: "Cinquante euros? Vous me prenez pour un touriste!", hint: "Fifty euros? You take me for a tourist!" },
          { text: "Prenez par les quais, c'est plus rapide.", hint: "Take the riverside, it's faster." },
          { text: "Alors, ça roule bien aujourd'hui?", hint: "So, how's traffic today?" },
        ],
      },
      en: {
        openingLine: {
          text: "Hop in! Tourist, huh? Fifty bucks to downtown.",
          hint: "The tourist price. Push back.",
        },
        starters: [
          { text: "Fifty? Do I look like a tourist to you?", hint: "Call the bluff" },
          { text: "Take the bridge, it's faster this time of day.", hint: "Show local knowledge" },
          { text: "So, how's traffic been today?", hint: "Start the banter" },
        ],
      },
      es: {
        openingLine: {
          text: "¡Suba! ¿Turista, no? Cincuenta euros al centro.",
          hint: "Get in! Tourist, right? Fifty euros to the center.",
        },
        starters: [
          { text: "¿Cincuenta? ¿Me toma por turista?", hint: "Fifty? Do you take me for a tourist?" },
          { text: "Vaya por la avenida, es más rápido.", hint: "Take the avenue, it's faster." },
          { text: "¿Qué tal el tráfico hoy?", hint: "How's traffic today?" },
        ],
      },
      ru: {
        openingLine: {
          text: "Садитесь! Ну что, турист? До Эйфелевой башни — пятьдесят евро.",
          hint: "Get in! So, tourist? Fifty euros to the Eiffel Tower.",
        },
        starters: [
          { text: "Пятьдесят? Вы что, принимаете меня за туриста?", hint: "Fifty? Do you take me for a tourist?" },
          { text: "По набережной быстрее, поверьте.", hint: "The riverside is faster, trust me." },
          { text: "Ну как, пробки сегодня?", hint: "So, how's traffic today?" },
        ],
      },
    },
    imagePrompt:
      "Paris taxi driving along the Seine at dusk with Eiffel Tower in the distance, warm city lights, cinematic illustration, no text, no logos",
  },
  {
    id: "landlord",
    title: "The Landlord",
    tagline: "Dream apartment, ten applicants. Win the lease.",
    goal: "Convince the landlord to give you the lease",
    meterLabel: "Trust",
    winMessage: "The apartment is yours! You got the lease.",
    persona: `You are a landlord showing a charming (tiny) apartment with a view of the rooftops. There are ten other applicants. You are wary and picky — you want a tenant who is stable, polite, and communicates well in the local language. Warmth, reliability signals, and good language build trust. Evasive answers or careless attitude lose it.

The character is {characterGender} and approximately 55-65 years old. Speak only in short lines (1-2 sentences). Stay in character, courteous but probing — ask about their work, habits, quietness.

Meter rules (0-100, progress toward offering the lease):
- Start around 10 on first user turn.
- Reassuring answers in good language: +8 to +15
- Excellent pronunciation or charming sincerity: +12 to +18
- Evasive, sloppy, or rude: -8 to -15
- At meter >= 90, offer the lease and set goal_achieved true
- Never jump more than 20 points in one turn

Always score the user's pronunciation. Provide 3 next_sentences the user could say next.`,
    voice: {
      ageRange: "55-65",
      tone: "Courteous, discerning landlord. Measured, slightly formal, quietly warm once convinced.",
    },
    content: {
      fr: {
        openingLine: {
          text: "Entrez, entrez. Alors, vous faites quoi dans la vie?",
          hint: "Come in, come in. So, what do you do for a living?",
        },
        starters: [
          { text: "Je travaille dans la tech, c'est très stable.", hint: "I work in tech, it's very stable." },
          { text: "Quel appartement magnifique, cette lumière!", hint: "What a magnificent apartment, this light!" },
          { text: "Je suis quelqu'un de très calme.", hint: "I'm a very quiet person." },
        ],
      },
      en: {
        openingLine: {
          text: "Come in, come in. So, what do you do for a living?",
          hint: "The vetting begins.",
        },
        starters: [
          { text: "I work in tech — very steady, very boring.", hint: "Stability with charm" },
          { text: "What a gorgeous apartment — that light!", hint: "Compliment the place" },
          { text: "I'm about as quiet as tenants get.", hint: "Address the classic worry" },
        ],
      },
      es: {
        openingLine: {
          text: "Pase, pase. ¿Y usted a qué se dedica?",
          hint: "Come in, come in. And what do you do for a living?",
        },
        starters: [
          { text: "Trabajo en tecnología, es muy estable.", hint: "I work in tech, it's very stable." },
          { text: "¡Qué piso tan bonito, cuánta luz!", hint: "What a beautiful apartment, so much light!" },
          { text: "Soy una persona muy tranquila.", hint: "I'm a very quiet person." },
        ],
      },
      ru: {
        openingLine: {
          text: "Проходите, проходите. Так, чем вы занимаетесь?",
          hint: "Come in, come in. So, what do you do for a living?",
        },
        starters: [
          { text: "Я работаю в IT, всё очень стабильно.", hint: "I work in tech, it's very stable." },
          { text: "Какая прекрасная квартира, столько света!", hint: "What a beautiful apartment, so much light!" },
          { text: "Я очень спокойный человек.", hint: "I'm a very quiet person." },
        ],
      },
    },
    imagePrompt:
      "Small charming Paris apartment with tall windows overlooking zinc rooftops, soft afternoon light, cinematic illustration, no text, no logos",
  },
  {
    id: "sommelier",
    title: "The Sommelier",
    tagline: "A hidden wine cave. Earn the private tasting.",
    goal: "Get invited to the private cellar tasting",
    meterLabel: "Impressed",
    winMessage: "Welcome to the private cellar! You're in.",
    persona: `You are a passionate sommelier in a small wine shop. You host a legendary private cellar tasting — invitation only. You are warm but you test people: curiosity about wine, willingness to learn, and effort in the local language impress you. Pretending to be an expert or being dismissive does not.

The character is {characterGender} and approximately 35-45 years old. Speak only in short lines (1-2 sentences). Stay in character, sensory and evocative when describing wine.

Meter rules (0-100, progress toward the private tasting invitation):
- Start around 15 on first user turn.
- Genuine curiosity and good language: +8 to +15
- Great pronunciation or a thoughtful question about wine: +12 to +18
- Fake expertise, dismissiveness, or bad manners: -5 to -12
- At meter >= 90, extend the invitation and set goal_achieved true
- Never jump more than 20 points in one turn

Always score the user's pronunciation. Provide 3 next_sentences the user could say next.`,
    voice: {
      ageRange: "35-45",
      tone: "Warm, evocative sommelier. Speaks about wine like poetry, gently testing your curiosity.",
    },
    content: {
      fr: {
        openingLine: {
          text: "Bienvenue! Vous cherchez quelque chose de particulier?",
          hint: "Welcome! Are you looking for something particular?",
        },
        starters: [
          { text: "Je ne connais rien au vin, mais je veux apprendre.", hint: "I know nothing about wine, but I want to learn." },
          { text: "Qu'est-ce que vous buvez en ce moment?", hint: "What are you drinking at the moment?" },
          { text: "C'est quoi votre bouteille préférée ici?", hint: "What's your favorite bottle here?" },
        ],
      },
      en: {
        openingLine: {
          text: "Welcome! Looking for anything in particular?",
          hint: "Show curiosity, not expertise.",
        },
        starters: [
          { text: "Honestly, I know nothing about wine — but I'd love to learn.", hint: "Humble curiosity wins" },
          { text: "What are you excited about pouring lately?", hint: "Ask about their passion" },
          { text: "What's your favorite bottle in the shop?", hint: "Invite a story" },
        ],
      },
      es: {
        openingLine: {
          text: "¡Bienvenido! ¿Busca algo en particular?",
          hint: "Welcome! Are you looking for something particular?",
        },
        starters: [
          { text: "No sé nada de vino, pero quiero aprender.", hint: "I know nothing about wine, but I want to learn." },
          { text: "¿Qué está bebiendo usted últimamente?", hint: "What have you been drinking lately?" },
          { text: "¿Cuál es su botella favorita de la tienda?", hint: "What's your favorite bottle in the shop?" },
        ],
      },
      ru: {
        openingLine: {
          text: "Добро пожаловать! Ищете что-то особенное?",
          hint: "Welcome! Are you looking for something particular?",
        },
        starters: [
          { text: "Я ничего не понимаю в вине, но хочу научиться.", hint: "I know nothing about wine, but I want to learn." },
          { text: "А что вы сейчас пьёте?", hint: "What are you drinking at the moment?" },
          { text: "Какая у вас любимая бутылка в магазине?", hint: "What's your favorite bottle in the shop?" },
        ],
      },
    },
    imagePrompt:
      "Intimate Paris wine cave with wooden shelves of bottles and candlelight, deep warm tones, cinematic illustration, no text, no logos",
  },
]

export const ALL_BUILT_IN_SCENARIOS: Scenario[] = [...SCENARIOS, ...LINGUA_TRAINERS]
