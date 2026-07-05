import type { Character } from "@/lib/character"

export const LANGUAGES_CHARACTERS: Character[] = [
  {
    id: "teacher",
    name: "The Teacher",
    tagline: "Practice pronunciation with a patient coach.",
    category: "languages",
    avatarPrompt:
      "Elegant Parisian language classroom with soft morning light, books and chalkboard, warm cinematic illustration, no text, no logos",
    voice: {
      ageRange: "30-40",
      gender: "opposite-speaker",
      voices: { female: "Sulafat", male: "Iapetus" },
      tone:
        "Warm, clear, and supportive — like a friendly pronunciation teacher. Professional and encouraging.",
    },
    persona: "",
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Teacher",
        subtitle: "Practice pronunciation with a patient coach.",
        mode: "coach",
        content: {
          fr: { openingLine: null, starters: [] },
          en: { openingLine: null, starters: [] },
          es: { openingLine: null, starters: [] },
          ru: { openingLine: null, starters: [] },
        },
      },
      {
        kind: "voice",
        id: "teacher-l2-cafe",
        title: "Order at the café",
        subtitle: "Use what you drilled in a real roleplay scene",
        mode: "roleplay",
        goal: "Order confidently at a busy café counter",
        meterLabel: "Confidence",
        winMessage: "Natural and clear — the barista understood every word.",
        personaOverlay: `SCENARIO: Busy café counter. You are a patient teacher playing the barista — stay in scene but keep responses short. Reward clear pronunciation and natural phrasing. Meter 0-100, start 15, goal at 90.`,
        content: {
          fr: {
            openingLine: { text: "Bonjour — la suite, s'il vous plaît!", hint: "Hello — next, please!" },
            starters: [
              { text: "Bonjour — un café crème, s'il vous plaît.", hint: "Order a coffee" },
              { text: "Je voudrais un croissant aussi.", hint: "Add a croissant" },
              { text: "C'est combien?", hint: "Ask the price" },
            ],
          },
          en: {
            openingLine: { text: "Hi — who's next?", hint: "Busy counter" },
            starters: [
              { text: "Hi — a latte, please.", hint: "Order coffee" },
              { text: "I'd like a croissant too.", hint: "Add pastry" },
              { text: "How much is that?", hint: "Ask price" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "teacher-l3-sounds",
        title: "Tricky sounds",
        subtitle: "Drill the sounds that give you away as a learner",
        mode: "coach",
        personaOverlay: `COACH MODE: Focus on difficult sounds for the user's language — R, nasal vowels, or rhythm. One phrase at a time, crisp feedback.`,
        content: {
          fr: {
            openingLine: { text: "Répétez: « Un croissant au beurre, s'il vous plaît. » — attention au « r ».", hint: "Watch the R sound" },
            starters: [
              { text: "Un croissant au beurre, s'il vous plaît.", hint: "Practice R" },
              { text: "Où est la boulangerie?", hint: "Nasal vowels" },
              { text: "Je voudrais un verre d'eau.", hint: "Linking sounds" },
            ],
          },
          en: {
            openingLine: { text: "Repeat: « I'd like a table for two, please. » — clear rhythm.", hint: "Stress and rhythm" },
            starters: [
              { text: "I'd like a table for two, please.", hint: "Polite rhythm" },
              { text: "Could we see the menu?", hint: "Softened consonants" },
              { text: "The weather is beautiful today.", hint: "Connected speech" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "teacher-l4-debate",
        title: "Opinion practice",
        subtitle: "Defend a point of view — fluency under pressure",
        status: "locked",
        lockLabel: "Pro",
      },
      {
        kind: "voice",
        id: "teacher-l5-story",
        title: "Tell a story",
        subtitle: "Five minutes uninterrupted — no fillers allowed",
        status: "wip",
        lockLabel: "Coming soon",
      },
    ],
  },
  {
    id: "boulanger",
    name: "The Boulanger",
    tagline: "Last croissant in the bakery. Charm your way to it.",
    category: "languages",
    avatarPrompt:
      "Cozy Paris boulangerie interior with golden croissants and baguettes in the display, warm bakery light, cinematic illustration, no text, no logos",
    voice: {
      ageRange: "40-50",
      gender: "random",
      voices: { female: "Aoede", male: "Algieba" },
      tone: "Proud, busy baker. Brisk but secretly soft-hearted about people who love bread.",
    },
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
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Boulanger",
        subtitle: "Last croissant in the bakery. Charm your way to it.",
        goal: "Get the last croissant — reserved for a regular",
        meterLabel: "Charm",
        winMessage: "The last croissant is yours! The baker caved.",
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
      },
      {
        kind: "voice",
        id: "boulanger-l2-coach",
        title: "Bakery vocabulary",
        subtitle: "Pronounce the words that win a baker's heart",
        mode: "coach",
        personaOverlay: `COACH MODE: You are the baker, but focus on pronunciation coaching only — no charm meter. Drill bakery vocabulary one phrase at a time: compliments, asking for recommendations, polite requests.`,
        content: {
          fr: {
            openingLine: {
              text: "Répétez: « Ça sent tellement bon ici! » — avec sincérité.",
              hint: "Repeat: It smells so good in here!",
            },
            starters: [
              { text: "Ça sent tellement bon ici!", hint: "Opening compliment" },
              { text: "C'est la meilleure boulangerie du quartier?", hint: "Neighborhood praise" },
              { text: "Qu'est-ce que vous me conseillez?", hint: "Ask for recommendation" },
            ],
          },
          en: {
            openingLine: {
              text: "Repeat: « It smells incredible in here. » — like you mean it.",
              hint: "Sincere compliment",
            },
            starters: [
              { text: "It smells incredible in here.", hint: "Opening compliment" },
              { text: "Is this the best bakery in the neighborhood?", hint: "Neighborhood praise" },
              { text: "What would you recommend?", hint: "Ask for recommendation" },
            ],
          },
          es: {
            openingLine: {
              text: "Repita: « ¡Qué bien huele aquí! » — con cariño.",
              hint: "Repeat with warmth",
            },
            starters: [
              { text: "¡Qué bien huele aquí!", hint: "Opening compliment" },
              { text: "¿Es la mejor panadería del barrio?", hint: "Neighborhood praise" },
              { text: "¿Qué me recomienda?", hint: "Ask for recommendation" },
            ],
          },
          ru: {
            openingLine: {
              text: "Повторите: « Как здесь вкусно пахнет! » — искренне.",
              hint: "Repeat sincerely",
            },
            starters: [
              { text: "Как здесь вкусно пахнет!", hint: "Opening compliment" },
              { text: "Это лучшая пекарня в районе?", hint: "Neighborhood praise" },
              { text: "Что вы посоветуете?", hint: "Ask for recommendation" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "boulanger-l3-order",
        title: "The morning rush",
        subtitle: "Queue out the door — order fast, stay charming",
        goal: "Get your order and maybe that croissant after all",
        meterLabel: "Charm",
        winMessage: "Order handled — and yes, you got the croissant.",
        personaOverlay: `SCENARIO: 8am rush, long queue behind the user. They must order efficiently — baguette tradition, two pains au chocolat — while staying warm. Rushed rudeness loses the croissant; smooth ordering with a compliment might still win it.`,
        content: {
          fr: {
            openingLine: {
              text: "Oui, oui — la file derrière vous. Qu'est-ce que ce sera?",
              hint: "Yes, yes — the line behind you. What'll it be?",
            },
            starters: [
              { text: "Une baguette tradition et deux pains au chocolat, s'il vous plaît.", hint: "Efficient order" },
              { text: "Et si le croissant réservé se libère, je le prends volontiers.", hint: "Soft croissant ask" },
              { text: "Désolé pour la file — tout a l'air délicieux.", hint: "Apologetic compliment" },
            ],
          },
          en: {
            openingLine: {
              text: "Yes, yes — people waiting. What can I get you?",
              hint: "Rush hour — order quickly",
            },
            starters: [
              { text: "One sourdough loaf and two chocolate croissants, please.", hint: "Efficient order" },
              { text: "If that reserved croissant frees up, I'll take it.", hint: "Soft croissant ask" },
              { text: "Sorry for the queue — everything looks amazing.", hint: "Apologetic compliment" },
            ],
          },
          es: {
            openingLine: {
              text: "Sí, sí — la fila detrás. ¿Qué va a ser?",
              hint: "Rush hour order",
            },
            starters: [
              { text: "Una baguette y dos croissants de chocolate, por favor.", hint: "Efficient order" },
              { text: "Si se libera el cruasán reservado, lo tomo.", hint: "Soft croissant ask" },
              { text: "Perdón por la fila — todo se ve delicioso.", hint: "Apologetic compliment" },
            ],
          },
          ru: {
            openingLine: {
              text: "Да, да — очередь за вами. Что будет?",
              hint: "Rush hour order",
            },
            starters: [
              { text: "Багет и два шоколадных круассана, пожалуйста.", hint: "Efficient order" },
              { text: "Если освободится зарезервированный круассан — возьму.", hint: "Soft croissant ask" },
              { text: "Извините за очередь — всё выглядит восхитительно.", hint: "Apologetic compliment" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "boulanger-l4-recipe",
        title: "The secret recipe",
        subtitle: "Charm your way into the baker's family formula",
        status: "locked",
        lockLabel: "Pro",
      },
      {
        kind: "voice",
        id: "boulanger-l5-catering",
        title: "Catering order",
        subtitle: "Forty croissants by 7am — don't mess this up",
        status: "wip",
        lockLabel: "Coming soon",
      },
    ],
  },
  {
    id: "sommelier",
    name: "The Sommelier",
    tagline: "A hidden wine cave. Earn the private tasting.",
    category: "languages",
    avatarPrompt:
      "Intimate Paris wine cave with wooden shelves of bottles and candlelight, deep warm tones, cinematic illustration, no text, no logos",
    voice: {
      ageRange: "35-45",
      gender: "random",
      voices: { female: "Callirrhoe", male: "Algieba" },
      tone: "Warm, evocative sommelier. Speaks about wine like poetry, gently testing your curiosity.",
    },
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
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Sommelier",
        subtitle: "A hidden wine cave. Earn the private tasting.",
        goal: "Get invited to the private cellar tasting",
        meterLabel: "Impressed",
        winMessage: "Welcome to the private cellar! You're in.",
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
      },
      {
        kind: "voice",
        id: "sommelier-l2-coach",
        title: "Wine vocabulary",
        subtitle: "Say terroir without sounding like a tourist",
        mode: "coach",
        personaOverlay: `COACH MODE: You are the sommelier, but focus on pronunciation coaching only — no impressed meter. Drill wine curiosity phrases: humble learning, asking about favorites, describing taste simply.`,
        content: {
          fr: {
            openingLine: {
              text: "Répétez: « Je ne connais rien au vin, mais je veux apprendre. » — humblement.",
              hint: "Repeat humbly",
            },
            starters: [
              { text: "Je ne connais rien au vin, mais je veux apprendre.", hint: "Humble curiosity" },
              { text: "Qu'est-ce que vous buvez en ce moment?", hint: "Ask about their current pour" },
              { text: "C'est fruité ou plutôt sec?", hint: "Simple taste question" },
            ],
          },
          en: {
            openingLine: {
              text: "Repeat: « I know nothing about wine — but I'd love to learn. » — genuinely curious.",
              hint: "Humble curiosity wins",
            },
            starters: [
              { text: "I know nothing about wine — but I'd love to learn.", hint: "Humble curiosity" },
              { text: "What are you excited about pouring lately?", hint: "Ask about passion" },
              { text: "Is this more fruity or dry?", hint: "Simple taste question" },
            ],
          },
          es: {
            openingLine: {
              text: "Repita: « No sé nada de vino, pero quiero aprender. » — con curiosidad.",
              hint: "Repeat with curiosity",
            },
            starters: [
              { text: "No sé nada de vino, pero quiero aprender.", hint: "Humble curiosity" },
              { text: "¿Qué está bebiendo usted últimamente?", hint: "Ask about their pour" },
              { text: "¿Es más afrutado o seco?", hint: "Simple taste question" },
            ],
          },
          ru: {
            openingLine: {
              text: "Повторите: « Я ничего не понимаю в вине, но хочу научиться. » — искренне.",
              hint: "Repeat sincerely",
            },
            starters: [
              { text: "Я ничего не понимаю в вине, но хочу научиться.", hint: "Humble curiosity" },
              { text: "А что вы сейчас пьёте?", hint: "Ask about their pour" },
              { text: "Это более фруктовое или сухое?", hint: "Simple taste question" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "sommelier-l3-pairing",
        title: "Dinner pairing",
        subtitle: "Duck confit tonight — find the right bottle",
        goal: "Get a pairing recommendation you're confident about",
        meterLabel: "Impressed",
        winMessage: "Perfect pairing — the sommelier respects your palate.",
        personaOverlay: `SCENARIO: The user is hosting dinner — duck confit, something rich. They must describe the meal, show curiosity, and accept guidance without pretending expertise. Same meter rules as main level.`,
        content: {
          fr: {
            openingLine: {
              text: "Canard confit ce soir — riche, salé. Qu'est-ce que vous cherchez?",
              hint: "Duck confit tonight — rich, salty. What are you looking for?",
            },
            starters: [
              { text: "Quelque chose qui coupe la graisse, mais pas trop agressif.", hint: "Something that cuts the fat, but not too aggressive." },
              { text: "Je fais confiance à votre recommandation.", hint: "I trust your recommendation." },
              { text: "Un rouge léger ou un blanc plus audacieux?", hint: "Light red or bolder white?" },
            ],
          },
          en: {
            openingLine: {
              text: "Duck confit tonight — rich, salty. What direction are you thinking?",
              hint: "Describe the meal, invite guidance",
            },
            starters: [
              { text: "Something that cuts the richness without overpowering it.", hint: "Smart pairing ask" },
              { text: "I'd trust your recommendation completely.", hint: "Defer to expertise" },
              { text: "Light red or a bolder white — what would you pick?", hint: "Invite their pick" },
            ],
          },
          es: {
            openingLine: {
              text: "Confit de pato esta noche — rico, salado. ¿Qué busca?",
              hint: "Duck confit tonight",
            },
            starters: [
              { text: "Algo que corte la grasa sin ser demasiado fuerte.", hint: "Smart pairing ask" },
              { text: "Confío en su recomendación.", hint: "Defer to expertise" },
              { text: "¿Tinto ligero o blanco más audaz?", hint: "Invite their pick" },
            ],
          },
          ru: {
            openingLine: {
              text: "Утиное конфи сегодня — насыщенное, солёное. Что ищете?",
              hint: "Duck confit tonight",
            },
            starters: [
              { text: "Что-то, что обрежет жирность, но не перебьёт блюдо.", hint: "Smart pairing ask" },
              { text: "Доверяю вашей рекомендации.", hint: "Defer to expertise" },
              { text: "Лёгкое красное или смелее белое?", hint: "Invite their pick" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "sommelier-l4-cellar",
        title: "Private cellar tour",
        subtitle: "The locked door — earn the full tour",
        status: "locked",
        lockLabel: "Pro",
      },
      {
        kind: "voice",
        id: "sommelier-l5-auction",
        title: "Wine auction",
        subtitle: "Bid on a rare bottle — don't blink first",
        status: "wip",
        lockLabel: "Coming soon",
      },
    ],
  },
  {
    id: "taxi",
    name: "The Taxi Driver",
    tagline: "A chatty driver. Convince them you're no tourist.",
    category: "languages",
    avatarPrompt:
      "Paris taxi driving along the Seine at dusk with Eiffel Tower in the distance, warm city lights, cinematic illustration, no text, no logos",
    voice: {
      ageRange: "40-55",
      gender: "random",
      voices: { female: "Laomedeia", male: "Fenrir" },
      tone: "Fast-talking, jovial taxi driver. Streetwise, teasing, full of opinions about traffic.",
    },
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
    levels: [
      {
        kind: "voice",
        id: "main",
        title: "The Taxi Driver",
        subtitle: "A chatty driver. Convince them you're no tourist.",
        goal: "Earn the local's secret route and a fair price",
        meterLabel: "Street cred",
        winMessage: "You're a real local now! Secret route unlocked.",
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
      },
      {
        kind: "voice",
        id: "taxi-l2-coach",
        title: "Directions & banter",
        subtitle: "Sound like you've lived here for years",
        mode: "coach",
        personaOverlay: `COACH MODE: You are the taxi driver, but focus on pronunciation coaching only — no street cred meter. Drill direction phrases and casual banter lines one at a time.`,
        content: {
          fr: {
            openingLine: {
              text: "Répétez: « Prenez par les quais, c'est plus rapide. » — comme un local.",
              hint: "Repeat like a local",
            },
            starters: [
              { text: "Prenez par les quais, c'est plus rapide.", hint: "Local route knowledge" },
              { text: "Cinquante euros? Vous me prenez pour un touriste!", hint: "Push back on tourist price" },
              { text: "Alors, ça roule bien aujourd'hui?", hint: "Casual banter opener" },
            ],
          },
          en: {
            openingLine: {
              text: "Repeat: « Take the bridge, it's faster this time of day. » — casual, confident.",
              hint: "Show local knowledge",
            },
            starters: [
              { text: "Take the bridge, it's faster this time of day.", hint: "Local route knowledge" },
              { text: "Fifty? Do I look like a tourist to you?", hint: "Push back on tourist price" },
              { text: "So, how's traffic been today?", hint: "Casual banter opener" },
            ],
          },
          es: {
            openingLine: {
              text: "Repita: « Vaya por la avenida, es más rápido. » — con naturalidad.",
              hint: "Repeat naturally",
            },
            starters: [
              { text: "Vaya por la avenida, es más rápido.", hint: "Local route knowledge" },
              { text: "¿Cincuenta? ¿Me toma por turista?", hint: "Push back on tourist price" },
              { text: "¿Qué tal el tráfico hoy?", hint: "Casual banter opener" },
            ],
          },
          ru: {
            openingLine: {
              text: "Повторите: « По набережной быстрее, поверьте. » — уверенно.",
              hint: "Repeat confidently",
            },
            starters: [
              { text: "По набережной быстрее, поверьте.", hint: "Local route knowledge" },
              { text: "Пятьдесят? Вы что, принимаете меня за туриста?", hint: "Push back on tourist price" },
              { text: "Ну как, пробки сегодня?", hint: "Casual banter opener" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "taxi-l3-shortcut",
        title: "The secret route",
        subtitle: "Traffic's gridlocked — prove you know a better way",
        goal: "Earn the shortcut and the fair meter price",
        meterLabel: "Street cred",
        winMessage: "Local confirmed — shortcut unlocked, fair price locked in.",
        personaOverlay: `SCENARIO: Rush hour gridlock. The driver wants to take the long scenic route at tourist rates. User must suggest a faster back street, banter naturally, and negotiate the meter fairly. Same meter rules as main level.`,
        content: {
          fr: {
            openingLine: {
              text: "Embouteillage total. On passe par le périph — soixante euros, minimum.",
              hint: "Total gridlock. We go via the ring road — sixty euros, minimum.",
            },
            starters: [
              { text: "Non — passez par la rue de l'Université, c'est dégagé.", hint: "Suggest the back street" },
              { text: "Au compteur, comme d'habitude. Je connais le trajet.", hint: "Meter, as usual. I know the route." },
              { text: "Allez, on se connaît — le prix local, pas le prix touriste.", hint: "Local price, not tourist price" },
            ],
          },
          en: {
            openingLine: {
              text: "Total gridlock. Long way around — sixty bucks, easy.",
              hint: "Driver pushes the expensive route",
            },
            starters: [
              { text: "No — cut through University Street, it's clear.", hint: "Suggest the back street" },
              { text: "Meter's fine. I know exactly where we're going.", hint: "Confident local energy" },
              { text: "Come on — local price, not tourist price.", hint: "Negotiate fairly" },
            ],
          },
          es: {
            openingLine: {
              text: "Atasco total. Por la autopista — sesenta euros, mínimo.",
              hint: "Total gridlock — expensive route",
            },
            starters: [
              { text: "No — por la calle Universidad, está despejada.", hint: "Suggest the back street" },
              { text: "Al taxímetro, como siempre. Conozco el camino.", hint: "Meter, as usual" },
              { text: "Vamos — precio local, no de turista.", hint: "Local price" },
            ],
          },
          ru: {
            openingLine: {
              text: "Полная пробка. Через кольцо — шестьдесят евро, минимум.",
              hint: "Gridlock — expensive route",
            },
            starters: [
              { text: "Нет — через улицу Университета, там свободно.", hint: "Suggest back street" },
              { text: "По счётчику. Я знаю дорогу.", hint: "Meter, confident" },
              { text: "Давайте — местная цена, не туристическая.", hint: "Local price" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "taxi-l4-airport",
        title: "Airport run",
        subtitle: "4am, no traffic — negotiate before you sit down",
        status: "locked",
        lockLabel: "Pro",
      },
      {
        kind: "voice",
        id: "taxi-l5-night",
        title: "Night shift stories",
        subtitle: "The driver knows everything — keep up",
        status: "wip",
        lockLabel: "Coming soon",
      },
    ],
  },
]
