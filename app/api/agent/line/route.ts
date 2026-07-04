import { NextResponse } from "next/server"

import { createAgentLine, getLineByUserId } from "@/lib/agent-lines"
import { getAgentUserId } from "@/lib/composio"

function getInboundNumbers() {
  return {
    us: process.env.TWILIO_PHONE_NUMBER?.trim() ?? null,
    europe: process.env.TWILIO_EUROPE_PHONE_NUMBER?.trim() ?? "+41445054446",
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = getAgentUserId(searchParams.get("userId"))
  const line = getLineByUserId(userId)

  if (!line) {
    return NextResponse.json({ line: null, userId })
  }

  return NextResponse.json({
    userId,
    line,
    inboundNumbers: getInboundNumbers(),
    instructions: {
      callIn: `Call ${getInboundNumbers().europe} from ${line.userPhone}, or enter PIN ${line.pin}.`,
      callMe: "Use Call me now in the app — your agent rings your phone.",
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string
      userPhone?: string
      displayName?: string
    }

    const userId = getAgentUserId(body.userId)
    const userPhone = body.userPhone?.trim()

    if (!userPhone || userPhone.replace(/\D/g, "").length < 8) {
      return NextResponse.json(
        { error: "A valid mobile number is required (E.164, e.g. +41761234567)" },
        { status: 400 },
      )
    }

    const line = createAgentLine({
      userId,
      userPhone,
      displayName: body.displayName,
    })

    const numbers = getInboundNumbers()

    return NextResponse.json({
      userId,
      line,
      inboundNumbers: numbers,
      instructions: {
        callIn: `Call ${numbers.europe} from your registered phone, or any phone with PIN ${line.pin}.`,
        callMe: "Tap Call me now — Parler Bien will ring your phone and start the agent.",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create agent line" },
      { status: 500 },
    )
  }
}
