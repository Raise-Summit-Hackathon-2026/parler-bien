import { NextResponse } from "next/server"

import {
  createAgentLine,
  getLineByUserId,
  parseAllowedCallerPhones,
  type AgentRole,
} from "@/lib/agent-lines"
import { getAgentUserId } from "@/lib/composio"
import { getSharedLineFallback } from "@/lib/twilio-provision"

const VALID_ROLES: AgentRole[] = ["executive", "sales", "support", "ops", "custom"]

function linePayload(line: NonNullable<ReturnType<typeof getLineByUserId>>) {
  const shared = getSharedLineFallback()
  const dedicated = line.dedicatedPhoneNumber

  return {
    line,
    deployment: {
      agentId: line.userId,
      lineId: line.lineId,
      workspace: line.workspaceName ?? null,
      role: line.agentRole ?? "executive",
      inboundPolicy:
        "Dedicated line: owner + allowlist only. Shared pool: PIN or registered caller ID.",
    },
    channels: {
      voice: dedicated ?? shared.europe ?? shared.us,
      sms: dedicated ?? shared.us,
      whatsappBusiness: dedicated && line.whatsappStatus === "whatsapp_online" ? dedicated : null,
    },
    sharedNumbers: shared,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = getAgentUserId(searchParams.get("userId"))
  const line = getLineByUserId(userId)

  if (!line) {
    return NextResponse.json({ line: null, userId, sharedNumbers: getSharedLineFallback() })
  }

  return NextResponse.json({ userId, ...linePayload(line) })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string
      userPhone?: string
      agentName?: string
      displayName?: string
      workspaceName?: string
      ownerEmail?: string
      agentRole?: string
      allowedCallerPhones?: string | string[]
    }

    const userId = getAgentUserId(body.userId)
    const userPhone = body.userPhone?.trim()
    const agentName = body.agentName?.trim()

    if (!agentName || agentName.length < 2) {
      return NextResponse.json({ error: "Agent name is required (min 2 characters)." }, { status: 400 })
    }

    if (!userPhone || userPhone.replace(/\D/g, "").length < 8) {
      return NextResponse.json(
        { error: "Owner mobile is required (E.164, e.g. +41761234567)." },
        { status: 400 },
      )
    }

    const agentRole = VALID_ROLES.includes(body.agentRole as AgentRole)
      ? (body.agentRole as AgentRole)
      : "executive"

    const line = createAgentLine({
      userId,
      userPhone,
      agentName,
      displayName: body.displayName,
      workspaceName: body.workspaceName,
      ownerEmail: body.ownerEmail,
      agentRole,
      allowedCallerPhones: parseAllowedCallerPhones(body.allowedCallerPhones),
    })

    return NextResponse.json({
      userId,
      ...linePayload(line),
      nextStep: "Connect enterprise data sources, then provision a dedicated business line.",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deploy agent" },
      { status: 500 },
    )
  }
}
