import { NextResponse } from "next/server"

import type { LanguageId } from "@/lib/languages"
import { isLanguageId } from "@/lib/languages"
import {
  createLiveAvatarSessionToken,
  resolveSessionAvatarId,
} from "@/lib/liveavatar-server"
import { requireCurrentUser } from "@/lib/supabase"
import type { LiveAvatarSessionRequest } from "@/lib/liveavatar"

export async function POST(request: Request) {
  const auth = await requireCurrentUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let body: LiveAvatarSessionRequest
  try {
    body = (await request.json()) as LiveAvatarSessionRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const language: LanguageId =
    body.language && isLanguageId(body.language) ? body.language : "fr"

  try {
    const avatarId = resolveSessionAvatarId(body)

    const { sessionId, sessionToken, sandbox, maxSessionDuration } =
      await createLiveAvatarSessionToken({
        avatarId,
        language,
      })

    return NextResponse.json({
      sessionId,
      sessionToken,
      avatarId,
      sandbox,
      maxSessionDuration,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create avatar session"
    const status = message.includes("not configured") ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
