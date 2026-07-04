const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "google/gemini-3.5-flash"

export async function transcribeAudio(
  audioBase64: string,
  audioFormat: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Parler Bien Agent",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe the user's speech exactly. Return only the transcript text, no quotes or commentary. If unintelligible, return [unclear].",
            },
            {
              type: "input_audio",
              input_audio: { data: audioBase64, format: audioFormat },
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error("Transcription error:", text)
    throw new Error("Failed to transcribe audio")
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  const transcript = data.choices[0]?.message?.content?.trim() ?? ""
  if (!transcript || transcript === "[unclear]") {
    throw new Error("Could not understand — speak clearly and try again.")
  }

  return transcript
}
