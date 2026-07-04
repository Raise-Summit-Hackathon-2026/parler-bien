const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const CONTENT_SAFETY_MODEL = "nvidia/nemotron-3.5-content-safety:free"

export type ModerationContext = {
  scenarioTitle: string
  languageName: string
  isRoleplay: boolean
}

export type ModerationOutcome =
  | { status: "safe" }
  | {
      status: "blocked"
      userSafe: boolean
      responseSafe: boolean
      reason: string
    }
  | { status: "skipped" }
  | { status: "error"; message: string }

export function isContentSafetyEnabled() {
  return process.env.CONTENT_SAFETY_ENABLED !== "false"
}

function parseModerationResponse(text: string) {
  const normalized = text.toLowerCase()

  const userMatch = normalized.match(/user safety:\s*(safe|unsafe)/)
  const responseMatch = normalized.match(/response safety:\s*(safe|unsafe)/)

  return {
    userSafe: userMatch ? userMatch[1] === "safe" : true,
    responseSafe: responseMatch ? responseMatch[1] === "safe" : true,
  }
}

export async function moderateExchange(
  apiKey: string,
  userText: string,
  assistantText: string,
  context: ModerationContext,
): Promise<ModerationOutcome> {
  if (!isContentSafetyEnabled()) {
    return { status: "skipped" }
  }

  const trimmedUser = userText.trim()
  const trimmedAssistant = assistantText.trim()
  if (!trimmedUser && !trimmedAssistant) {
    return { status: "safe" }
  }

  const contextLine = context.isRoleplay
    ? `This is a language-learning roleplay scenario ("${context.scenarioTitle}") in ${context.languageName}. In-character rudeness, negotiation, or mild flirting is expected and should be allowed.`
    : `This is a language-learning pronunciation coach session in ${context.languageName}.`

  const prompt = `${contextLine}

Only flag severe harm: hate speech, harassment, explicit sexual content, violence, self-harm, illegal instructions, or content involving minors. Do not flag normal language practice or in-character scenario dialogue.

User said:
${trimmedUser || "(empty or unintelligible)"}

Assistant replied:
${trimmedAssistant || "(empty)"}`

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Parler Bien",
        },
        body: JSON.stringify({
          model: CONTENT_SAFETY_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a content safety moderator for a language-learning app. Classify the user message and assistant response.",
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
