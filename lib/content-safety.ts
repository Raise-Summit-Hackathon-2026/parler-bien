import type { GeneratedCharacterPayload } from "@/lib/character-generate-schema"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const CONTENT_SAFETY_MODEL = "nvidia/nemotron-3.5-content-safety:free"

export type GenerationModerationContext = {
  languageName: string
}

export type ModerationOutcome =
  | { status: "safe" }
  | {
      status: "blocked"
      userSafe: boolean
      responseSafe: boolean
      reason: string
    }
  | { status: "error"; message: string }

function parseModerationResponse(text: string) {
  const normalized = text.toLowerCase()

  const userMatch = normalized.match(/user safety:\s*(safe|unsafe)/)
  const responseMatch = normalized.match(/response safety:\s*(safe|unsafe)/)

  return {
    userSafe: userMatch ? userMatch[1] === "safe" : true,
    responseSafe: responseMatch ? responseMatch[1] === "safe" : true,
  }
}

export function scenarioTextForModeration(payload: GeneratedCharacterPayload) {
  return [
    payload.title,
    payload.tagline,
    payload.goal,
    payload.persona,
    payload.openingLine.text,
    ...payload.starters.map((starter) => starter.text),
    payload.winMessage,
  ]
    .filter(Boolean)
    .join("\n")
}

export function scenariosTextForModeration(payloads: GeneratedCharacterPayload[]) {
  return payloads.map(scenarioTextForModeration).join("\n\n---\n\n")
}

export async function moderateGeneratedContent(
  apiKey: string,
  userSource: string,
  generatedText: string,
  context: GenerationModerationContext,
): Promise<ModerationOutcome> {
  const trimmedUser = userSource.trim()
  const trimmedGenerated = generatedText.trim()
  if (!trimmedUser && !trimmedGenerated) {
    return { status: "safe" }
  }

  const prompt = `This is AI-generated content for a language-learning roleplay scenario in ${context.languageName}, created from user-provided source material. Review whether the source and generated content are appropriate to publish in the app.

Only flag severe harm: hate speech, harassment, explicit sexual content, violence, self-harm, illegal instructions, or content involving minors. Normal language-practice roleplay scenarios should be allowed.

User source:
${trimmedUser || "(empty)"}

Generated content:
${trimmedGenerated || "(empty)"}`

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Parler Bien",
        },
        body: JSON.stringify({
          model: CONTENT_SAFETY_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a content safety moderator for a language-learning app. Classify the user source and generated content.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.01,
          max_tokens: 256,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Content safety error:", errorText)
        return { status: "error", message: errorText }
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const content = data.choices?.[0]?.message?.content?.trim()
      if (!content) {
        if (attempt === 0) continue
        return { status: "error", message: "Empty moderation response" }
      }

      const { userSafe, responseSafe } = parseModerationResponse(content)
      if (userSafe && responseSafe) {
        return { status: "safe" }
      }

      return {
        status: "blocked",
        userSafe,
        responseSafe,
        reason: content,
      }
    }

    return { status: "error", message: "Empty moderation response" }
  } catch (error) {
    console.error("Content safety request failed:", error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export function generationBlockedMessage(moderation: {
  userSafe: boolean
  responseSafe: boolean
}) {
  if (!moderation.userSafe) {
    return "Your source material wasn't appropriate for training content. Try rephrasing or using different material."
  }

  return "The generated content didn't pass safety review. Try adjusting your prompt or source material."
}
