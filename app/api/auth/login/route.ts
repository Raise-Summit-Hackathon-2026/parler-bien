import { NextResponse } from "next/server"

import { createSession, loginUser } from "@/lib/auth"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string
    password?: string
  } | null

  if (!body?.email || !body.password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    )
  }

  const result = await loginUser(body.email, body.password)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  await createSession(result.user.id)
  return NextResponse.json({ user: result.user })
}
