import type { Character } from "@/lib/character"

export const EVERYDAY_CHARACTERS: Character[] = [
  {
    id: "vendor",
    name: "The Market Vendor",
    tagline: "Haggle at the flea market. Get the lamp under 20.",
    category: "everyday",
    avatarPrompt:
      "Paris flea market stall with a glowing vintage brass lamp, colorful antiques, golden afternoon light, cinematic illustration, no text, no logos",
    voice: {
      ageRange: "50-60",
      gender: "random",
      voices: { female: "Kore", male: "Charon" },
      tone: "Gruff but warm flea-market vendor. Direct, slightly theatrical, never mean.",
    },
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
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Market Vendor",
        subtitle: "Haggle at the flea market. Get the lamp under 20.",
        goal: "Get the vintage lamp for under 20 (euros or dollars)",
        meterLabel: "Deal likelihood",
        winMessage: "Deal! You talked them down.",
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
      },
    ],
  },
  {
    id: "parisian",
    name: "The Parisian",
    tagline: "A café encounter. Can you get their number?",
    category: "everyday",
    avatarPrompt:
      "Charming Paris café terrace with coffee cups and croissants, soft morning light, romantic cinematic illustration, no text, no logos",
    voice: {
      ageRange: "25-35",
      gender: "random",
      voices: { female: "Sulafat", male: "Puck" },
      tone: "Reserved but playful local at a café. Natural, slightly teasing, never cruel.",
    },
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
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Parisian",
        subtitle: "A café encounter. Can you get their number?",
        goal: "Get their phone number",
        meterLabel: "Interest",
        winMessage: "You got the number! Mission accomplished.",
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
      },
    ],
  },
  {
    id: "waiter",
    name: "The Waiter",
    tagline: "Full bistro, no reservation. Win over the waiter.",
    category: "everyday",
    avatarPrompt:
      "Elegant Paris bistro at night with candlelit tables, brass and red leather, warm romantic light, cinematic illustration, no text, no logos",
    voice: {
      ageRange: "45-55",
      gender: "random",
      voices: { female: "Kore", male: "Rasalgethi" },
      tone: "Impeccably dry bistro waiter. Formal, theatrical, a hint of amusement beneath the frost.",
    },
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
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Waiter",
        subtitle: "Full bistro, no reservation. Win over the waiter.",
        goal: "Get a table without a reservation",
        meterLabel: "Respect",
        winMessage: "Your table is ready! You earned your seat.",
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
      },
    ],
  },
  {
    id: "landlord",
    name: "The Landlord",
    tagline: "Dream apartment, ten applicants. Win the lease.",
    category: "everyday",
    avatarPrompt:
      "Small charming Paris apartment with tall windows overlooking zinc rooftops, soft afternoon light, cinematic illustration, no text, no logos",
    voice: {
      ageRange: "55-65",
      gender: "random",
      voices: { female: "Vindemiatrix", male: "Charon" },
      tone: "Courteous, discerning landlord. Measured, slightly formal, quietly warm once convinced.",
    },
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
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Landlord",
        subtitle: "Dream apartment, ten applicants. Win the lease.",
        goal: "Convince the landlord to give you the lease",
        meterLabel: "Trust",
        winMessage: "The apartment is yours! You got the lease.",
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
      },
    ],
  },
]
