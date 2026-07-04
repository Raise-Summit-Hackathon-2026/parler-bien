import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

import { runAgentChat } from "@/lib/agent-chat"
import { getLineByDedicatedNumber, getLineByUserId, resolveAgentUserId } from "@/lib/agent-lines"
import { getTwilioClient } from "@/lib/twilio-client"

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function stripChannelPrefix(value: string): string {
  return value.replace(/^whatsapp:/, "")
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const from = formValue(formData, "From")
  const to = formValue(formData, "To")
  const body = formValue(formData, "Body")

  if (!body) {
    return new NextResponse("", { status: 200 })
  }

  const callerPhone = stripChannelPrefix(from)
  const calledNumber = stripChannelPrefix(to)
  const isWhatsApp = from.startsWith("whatsapp:")

  let agentUserId = resolveAgentUserId({ callerPhone, calledNumber })

  if (!agentUserId && calledNumber) {
    const blocked = getLineByDedicatedNumber(calledNumber)
    if (blocked) {
      return sendReply({
        isWhatsApp,
        from,
        to,
        body: "This business line accepts messages from approved numbers only. Contact your administrator.",
      })
    }
  }

  if (!agentUserId && /^\d{4}$/.test(body.trim())) {
    agentUserId = resolveAgentUserId({ pin: body.trim() })
    if (agentUserId) {
      const line = getLineByUserId(agentUserId)
      const reply = line
        ? `Hi! You're connected to ${line.agentName ?? "your agent"}. Send a message to start.`
        : "Connected. How can I help?"
      return sendReply({ isWhatsApp, from, to, body: reply })
    }
  }

  if (!agentUserId) {
    return sendReply({
      isWhatsApp,
      from,
      to,
      body: "Parler Bien enterprise agent. Use your dedicated business line or enter your deployment PIN.",
    })
  }

  try {
    const { reply } = await runAgentChat(agentUserId, [{ role: "user", content: body }])
    return sendReply({ isWhatsApp, from, to, body: reply })
  } catch (error) {
    console.error("Messaging agent error:", error)
    return sendReply({
      isWhatsApp,
      from,
      to,
      body: "Sorry, I hit an error. Try again in a moment.",
    })
  }
}

async function sendReply(options: {
  isWhatsApp: boolean
  from: string
  to: string
  body: string
}): Promise<NextResponse> {
  const text = options.body.slice(0, 4000)

  if (options.isWhatsApp) {
    try {
      const client = getTwilioClient()
      await client.messages.create({
        from: options.to.startsWith("whatsapp:") ? options.to : `whatsapp:${stripChannelPrefix(options.to)}`,
        to: options.from.startsWith("whatsapp:") ? options.from : `whatsapp:${stripChannelPrefix(options.from)}`,
        body: text,
      })
    } catch (error) {
      console.error("WhatsApp reply error:", error)
    }
    return new NextResponse("", { status: 200 })
  }

  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(text)
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
