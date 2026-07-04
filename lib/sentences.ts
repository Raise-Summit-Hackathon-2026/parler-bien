import type { LanguageId } from "@/lib/languages"
import type { SentenceSuggestion } from "@/lib/types"

const FRENCH_SENTENCES: SentenceSuggestion[] = [
  { text: "Je voudrais un croissant, s'il vous plaît.", hint: "I'd like a croissant, please." },
  { text: "Un café crème, s'il vous plaît.", hint: "A coffee with milk, please." },
  { text: "Où est la station de métro ?", hint: "Where is the metro station?" },
  { text: "Combien ça coûte ?", hint: "How much does it cost?" },
  { text: "Je ne comprends pas.", hint: "I don't understand." },
  { text: "Parlez-vous anglais ?", hint: "Do you speak English?" },
  { text: "L'addition, s'il vous plaît.", hint: "The bill, please." },
  { text: "Je cherche la pharmacie.", hint: "I'm looking for the pharmacy." },
  { text: "C'est pour offrir.", hint: "It's a gift." },
  { text: "Avez-vous une table pour deux ?", hint: "Do you have a table for two?" },
  { text: "Je suis perdu.", hint: "I'm lost." },
  { text: "Quelle heure est-il ?", hint: "What time is it?" },
  { text: "Un billet pour Paris, s'il vous plaît.", hint: "A ticket to Paris, please." },
  { text: "Je voudrais réserver une chambre.", hint: "I'd like to book a room." },
  { text: "C'est délicieux !", hint: "It's delicious!" },
  { text: "Pouvez-vous répéter, s'il vous plaît ?", hint: "Can you repeat, please?" },
  { text: "Je suis allergique aux noix.", hint: "I'm allergic to nuts." },
  { text: "Où sont les toilettes ?", hint: "Where are the restrooms?" },
  { text: "Bonne journée !", hint: "Have a good day!" },
  { text: "Excusez-moi, madame.", hint: "Excuse me, madam." },
  { text: "Je viens de Londres.", hint: "I'm from London." },
  { text: "C'est trop cher pour moi.", hint: "It's too expensive for me." },
]

const ENGLISH_SENTENCES: SentenceSuggestion[] = [
  { text: "Could I get a table for two, please?", hint: "Polite restaurant request" },
  { text: "How much does this cost?", hint: "Asking a price" },
  { text: "I'm sorry, could you say that again?", hint: "Asking to repeat" },
  { text: "Excuse me, where's the nearest subway station?", hint: "Asking directions" },
  { text: "I'd like a flat white to go, please.", hint: "Ordering coffee" },
  { text: "That sounds great — let's do it.", hint: "Agreeing enthusiastically" },
  { text: "I'm just browsing, thanks.", hint: "Shop small talk" },
  { text: "Could I get the check, please?", hint: "Asking for the bill" },
  { text: "I have a reservation under Smith.", hint: "Checking in" },
  { text: "What would you recommend?", hint: "Asking for a suggestion" },
  { text: "It was lovely meeting you.", hint: "Warm goodbye" },
  { text: "I'm allergic to peanuts, is that okay?", hint: "Dietary needs" },
]

const SPANISH_SENTENCES: SentenceSuggestion[] = [
  { text: "Quisiera un café con leche, por favor.", hint: "I'd like a coffee with milk, please." },
  { text: "¿Cuánto cuesta esto?", hint: "How much does this cost?" },
  { text: "¿Dónde está la estación de metro?", hint: "Where is the metro station?" },
  { text: "No entiendo, ¿puede repetir?", hint: "I don't understand, can you repeat?" },
  { text: "La cuenta, por favor.", hint: "The bill, please." },
  { text: "¿Tiene una mesa para dos?", hint: "Do you have a table for two?" },
  { text: "Estoy perdido, ¿me puede ayudar?", hint: "I'm lost, can you help me?" },
  { text: "¡Está delicioso!", hint: "It's delicious!" },
  { text: "Soy alérgico a los frutos secos.", hint: "I'm allergic to nuts." },
  { text: "¿Qué me recomienda?", hint: "What do you recommend?" },
  { text: "Es demasiado caro para mí.", hint: "It's too expensive for me." },
  { text: "¡Que tenga un buen día!", hint: "Have a good day!" },
]

const RUSSIAN_SENTENCES: SentenceSuggestion[] = [
  { text: "Можно кофе с молоком, пожалуйста?", hint: "A coffee with milk, please." },
  { text: "Сколько это стоит?", hint: "How much does it cost?" },
  { text: "Где находится станция метро?", hint: "Where is the metro station?" },
  { text: "Я не понимаю, повторите, пожалуйста.", hint: "I don't understand, please repeat." },
  { text: "Счёт, пожалуйста.", hint: "The bill, please." },
  { text: "У вас есть столик на двоих?", hint: "Do you have a table for two?" },
  { text: "Я заблудился, можете помочь?", hint: "I'm lost, can you help?" },
  { text: "Это очень вкусно!", hint: "It's delicious!" },
  { text: "У меня аллергия на орехи.", hint: "I'm allergic to nuts." },
  { text: "Что вы порекомендуете?", hint: "What do you recommend?" },
  { text: "Для меня это слишком дорого.", hint: "It's too expensive for me." },
  { text: "Хорошего дня!", hint: "Have a good day!" },
  { text: "Извините, вы не подскажете?", hint: "Excuse me, could you help?" },
  { text: "Я из Лондона.", hint: "I'm from London." },
  { text: "Можно повторить помедленнее?", hint: "Can you repeat more slowly?" },
]

const SENTENCE_POOLS: Record<LanguageId, SentenceSuggestion[]> = {
  fr: FRENCH_SENTENCES,
  en: ENGLISH_SENTENCES,
  es: SPANISH_SENTENCES,
  ru: RUSSIAN_SENTENCES,
}

export function pickRandomSentences(
  count: number,
  languageId: LanguageId = "fr",
): SentenceSuggestion[] {
  const pool = SENTENCE_POOLS[languageId]
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
