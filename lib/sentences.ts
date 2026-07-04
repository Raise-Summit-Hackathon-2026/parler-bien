export type SentenceSuggestion = {
  text: string
  hint: string
}

export const STARTER_SENTENCES: SentenceSuggestion[] = [
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

export function pickRandomSentences(
  count: number,
  exclude: SentenceSuggestion[] = [],
): SentenceSuggestion[] {
  const excludeTexts = new Set(exclude.map((s) => s.text))
  const pool = STARTER_SENTENCES.filter((s) => !excludeTexts.has(s.text))

  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
