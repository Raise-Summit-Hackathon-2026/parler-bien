import type { Character } from "@/lib/character"
import { SERVICE_GESTURES } from "@/lib/gestures"

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
      {
        kind: "voice",
        id: "vendor-l2-coach",
        title: "Haggling phrases",
        subtitle: "Drill the market lines until they sound natural",
        mode: "coach",
        personaOverlay: `COACH MODE: You are the vendor, but your job is pronunciation coaching only — no deal meter. Drill one haggling phrase at a time in the user's practice language. Listen, give crisp feedback, ask them to repeat with more confidence.`,
        content: {
          fr: {
            openingLine: {
              text: "Répétez: « C'est trop cher pour moi. » — plus lentement, plus sûr.",
              hint: "Repeat: That's too expensive for me.",
            },
            starters: [
              { text: "C'est trop cher pour moi.", hint: "Push back on price" },
              { text: "Vingt euros, et on conclut?", hint: "Make an offer" },
              { text: "Vous pouvez faire un prix?", hint: "Ask for a discount" },
            ],
          },
          en: {
            openingLine: {
              text: "Repeat after me: « That's way too steep for me. » — slower, steadier.",
              hint: "Push back with confidence",
            },
            starters: [
              { text: "That's way too steep for me.", hint: "Push back on price" },
              { text: "Twenty bucks, cash, right now.", hint: "Firm offer" },
              { text: "Come on, can you do me a better price?", hint: "Ask for a discount" },
            ],
          },
          es: {
            openingLine: {
              text: "Repita: « Es demasiado caro para mí. » — con más calma.",
              hint: "Repeat: It's too expensive for me.",
            },
            starters: [
              { text: "Es demasiado caro para mí.", hint: "Push back on price" },
              { text: "¿Veinte euros y cerramos?", hint: "Make an offer" },
              { text: "¿Me puede hacer un descuento?", hint: "Ask for a discount" },
            ],
          },
          ru: {
            openingLine: {
              text: "Повторите: « Для меня это слишком дорого. » — медленнее и увереннее.",
              hint: "Repeat: That's too expensive for me.",
            },
            starters: [
              { text: "Для меня это слишком дорого.", hint: "Push back on price" },
              { text: "Двадцать евро — и договорились?", hint: "Make an offer" },
              { text: "Можете сделать скидку?", hint: "Ask for a discount" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "vendor-l3-condition",
        title: "Inspect the lamp",
        subtitle: "Spot the flaw, negotiate harder",
        goal: "Use the scratch to get the lamp under 15",
        meterLabel: "Deal likelihood",
        winMessage: "Smart eye — you talked them down on the flaw.",
        personaOverlay: `SCENARIO: The user noticed a small scratch on the lamp base. You initially dismiss it, but good language and a fair offer move you. They must point out the flaw politely and leverage it. Meter rules same as main level.`,
        content: {
          fr: {
            openingLine: {
              text: "Quoi? C'est rien, une petite rayure — la lampe est parfaite.",
              hint: "What? It's nothing, a tiny scratch — the lamp is perfect.",
            },
            starters: [
              { text: "Je vois une rayure ici — ça change la valeur.", hint: "I see a scratch here — that changes the value." },
              { text: "Pour quinze euros avec la rayure, je la prends.", hint: "For fifteen with the scratch, I'll take it." },
              { text: "Sinon je regarde ailleurs.", hint: "Otherwise I'll look elsewhere." },
            ],
          },
          en: {
            openingLine: {
              text: "What scratch? That's patina — adds character. Still thirty-five.",
              hint: "The vendor dismisses the flaw.",
            },
            starters: [
              { text: "There's a scratch on the base — that should come off the price.", hint: "Point out the flaw" },
              { text: "Fifteen with the scratch, and it's mine.", hint: "Leverage the flaw" },
              { text: "Plenty of stalls here — your call.", hint: "Walk-away pressure" },
            ],
          },
          es: {
            openingLine: {
              text: "¿Qué rayón? Eso es patina — le da carácter. Siguen siendo treinta y cinco.",
              hint: "What scratch? That's patina — adds character.",
            },
            starters: [
              { text: "Hay un rayón en la base — eso baja el precio.", hint: "There's a scratch on the base." },
              { text: "Quince con el rayón y me la llevo.", hint: "Fifteen with the scratch." },
              { text: "Hay más puestos — usted decide.", hint: "Walk-away pressure" },
            ],
          },
          ru: {
            openingLine: {
              text: "Какая царапина? Это патина — придаёт характер. Всё ещё тридцать пять.",
              hint: "What scratch? That's patina.",
            },
            starters: [
              { text: "На основании царапина — это снижает цену.", hint: "Scratch lowers the price." },
              { text: "Пятнадцать с царапиной — забираю.", hint: "Fifteen with the scratch." },
              { text: "Ларьков полно — решайте сами.", hint: "Walk-away pressure" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "vendor-l4-night",
        title: "Night market",
        subtitle: "After dark, different vendors, different rules",
        status: "locked",
        lockLabel: "Pro",
      },
      {
        kind: "voice",
        id: "vendor-l5-antiques",
        title: "The antique dealer",
        subtitle: "High stakes — one rare piece, six bidders",
        status: "wip",
        lockLabel: "Coming soon",
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
      {
        kind: "voice",
        id: "waiter-l2-coach",
        title: "Bistro etiquette",
        subtitle: "Drill the phrases that earn a waiter's respect",
        mode: "coach",
        personaOverlay: `COACH MODE: You are the waiter, but focus on pronunciation coaching only — no respect meter. Drill polite bistro phrases one at a time. Reward proper formality and clear delivery.`,
        content: {
          fr: {
            openingLine: {
              text: "Répétez avec élégance: « Bonsoir — une petite table pour deux, c'est possible? »",
              hint: "Repeat with elegance",
            },
            starters: [
              { text: "Bonsoir — une petite table pour deux, c'est possible?", hint: "Polite table request" },
              { text: "On m'a dit que votre cuisine est légendaire.", hint: "Flatter the kitchen" },
              { text: "C'est notre dernière soirée à Paris.", hint: "Personal touch" },
            ],
          },
          en: {
            openingLine: {
              text: "Repeat with poise: « Good evening — any chance of a small table for two? »",
              hint: "Polite and confident",
            },
            starters: [
              { text: "Good evening — any chance of a small table for two?", hint: "Polite table request" },
              { text: "I've heard your kitchen is legendary.", hint: "Flatter the kitchen" },
              { text: "It's our last night in town.", hint: "Personal touch" },
            ],
          },
          es: {
            openingLine: {
              text: "Repita con elegancia: « Buenas noches — ¿habría una mesita para dos? »",
              hint: "Repeat with elegance",
            },
            starters: [
              { text: "Buenas noches — ¿habría una mesita para dos?", hint: "Polite table request" },
              { text: "Me han dicho que su cocina es legendaria.", hint: "Flatter the kitchen" },
              { text: "Es nuestra última noche en la ciudad.", hint: "Personal touch" },
            ],
          },
          ru: {
            openingLine: {
              text: "Повторите изящно: « Добрый вечер — не найдётся столик на двоих? »",
              hint: "Repeat with elegance",
            },
            starters: [
              { text: "Добрый вечер — не найдётся столик на двоих?", hint: "Polite table request" },
              { text: "Мне говорили, что у вас легендарная кухня.", hint: "Flatter the kitchen" },
              { text: "Это наш последний вечер в городе.", hint: "Personal touch" },
            ],
          },
        },
      },
      {
        kind: "gesture",
        id: "waiter-l3-service",
        title: "Table service",
        subtitle: "Show the poise of a guest who belongs here",
        steps: SERVICE_GESTURES,
        winMessage: "Impeccable composure — even the maître d' noticed.",
        holdMs: 1400,
      },
      {
        kind: "voice",
        id: "waiter-l4-wine",
        title: "Wine pairing",
        subtitle: "The sommelier is busy — the waiter expects you to know your grapes",
        status: "locked",
        lockLabel: "Pro",
      },
      {
        kind: "voice",
        id: "waiter-l5-kitchen",
        title: "Kitchen complaint",
        subtitle: "The dish is wrong — stay gracious, get it fixed",
        status: "wip",
        lockLabel: "Coming soon",
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
      {
        kind: "voice",
        id: "landlord-l2-coach",
        title: "Tenant phrases",
        subtitle: "Sound reliable, stable, and easy to live with",
        mode: "coach",
        personaOverlay: `COACH MODE: You are the landlord, but focus on pronunciation coaching only — no trust meter. Drill reassuring tenant phrases: stable job, quiet habits, love for the apartment.`,
        content: {
          fr: {
            openingLine: {
              text: "Répétez: « Je travaille dans la tech, c'est très stable. » — clairement, sans hésitation.",
              hint: "Repeat: I work in tech, it's very stable.",
            },
            starters: [
              { text: "Je travaille dans la tech, c'est très stable.", hint: "Signal stability" },
              { text: "Quel appartement magnifique, cette lumière!", hint: "Compliment the place" },
              { text: "Je suis quelqu'un de très calme.", hint: "Quiet tenant promise" },
            ],
          },
          en: {
            openingLine: {
              text: "Repeat: « I work in tech — very steady, very boring. » — clear and unhurried.",
              hint: "Stability with a touch of charm",
            },
            starters: [
              { text: "I work in tech — very steady, very boring.", hint: "Signal stability" },
              { text: "What a gorgeous apartment — that light!", hint: "Compliment the place" },
              { text: "I'm about as quiet as tenants get.", hint: "Quiet tenant promise" },
            ],
          },
          es: {
            openingLine: {
              text: "Repita: « Trabajo en tecnología, es muy estable. » — con seguridad.",
              hint: "Repeat with confidence",
            },
            starters: [
              { text: "Trabajo en tecnología, es muy estable.", hint: "Signal stability" },
              { text: "¡Qué piso tan bonito, cuánta luz!", hint: "Compliment the place" },
              { text: "Soy una persona muy tranquila.", hint: "Quiet tenant promise" },
            ],
          },
          ru: {
            openingLine: {
              text: "Повторите: « Я работаю в IT, всё очень стабильно. » — чётко и спокойно.",
              hint: "Repeat with confidence",
            },
            starters: [
              { text: "Я работаю в IT, всё очень стабильно.", hint: "Signal stability" },
              { text: "Какая прекрасная квартира, столько света!", hint: "Compliment the place" },
              { text: "Я очень спокойный человек.", hint: "Quiet tenant promise" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "landlord-l3-neighbors",
        title: "Meet the neighbors",
        subtitle: "The upstairs tenant had complaints — reassure the landlord",
        goal: "Convince the landlord you're worth the risk",
        meterLabel: "Trust",
        winMessage: "Lease signed — the landlord chose you over ten others.",
        personaOverlay: `SCENARIO: Another applicant mentioned noise concerns. The landlord is probing whether you'll be a problem neighbor. Reassure with specifics — quiet hours, no parties, respect for shared spaces. Same meter rules as main level.`,
        content: {
          fr: {
            openingLine: {
              text: "Le voisin du dessus s'inquiète du bruit. Vous recevez souvent des amis?",
              hint: "The upstairs neighbor worries about noise. Do you often have friends over?",
            },
            starters: [
              { text: "Je suis très calme — je rentre tard et je ne reçois presque jamais.", hint: "I'm very quiet — home late, rarely host." },
              { text: "Je comprends, les murs sont fins. Je ferai attention.", hint: "I understand, thin walls. I'll be careful." },
              { text: "Je cherche surtout un chez-moi stable, pas une fête.", hint: "I want a stable home, not a party pad." },
            ],
          },
          en: {
            openingLine: {
              text: "The upstairs tenant mentioned noise worries. Do you have people over often?",
              hint: "The landlord probes about noise.",
            },
            starters: [
              { text: "I'm very quiet — home late, almost never host.", hint: "Reassure on noise" },
              { text: "I get it, thin walls. I'll be mindful.", hint: "Show empathy" },
              { text: "I'm looking for a stable home, not a party pad.", hint: "Signal intent" },
            ],
          },
          es: {
            openingLine: {
              text: "El vecino de arriba se preocupa por el ruido. ¿Recibe mucha gente?",
              hint: "Upstairs neighbor worries about noise.",
            },
            starters: [
              { text: "Soy muy tranquilo — llego tarde y casi nunca recibo.", hint: "Reassure on noise" },
              { text: "Entiendo, las paredes son finas. Tendré cuidado.", hint: "Show empathy" },
              { text: "Busco un hogar estable, no fiestas.", hint: "Signal intent" },
            ],
          },
          ru: {
            openingLine: {
              text: "Сосед сверху переживает из-за шума. У вас часто бывают гости?",
              hint: "Upstairs neighbor worries about noise.",
            },
            starters: [
              { text: "Я очень тихий — прихожу поздно, почти никого не принимаю.", hint: "Reassure on noise" },
              { text: "Понимаю, стены тонкие. Буду внимателен.", hint: "Show empathy" },
              { text: "Мне нужен спокойный дом, а не вечеринки.", hint: "Signal intent" },
            ],
          },
        },
      },
      {
        kind: "voice",
        id: "landlord-l4-deposit",
        title: "Deposit negotiation",
        subtitle: "Everything's perfect — except the security deposit",
        status: "locked",
        lockLabel: "Pro",
      },
      {
        kind: "voice",
        id: "landlord-l5-movein",
        title: "Move-in day",
        subtitle: "Keys in hand — inspect every corner before signing",
        status: "wip",
        lockLabel: "Coming soon",
      },
    ],
  },
]
