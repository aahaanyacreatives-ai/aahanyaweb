import { NextResponse } from "next/server"
import twilio, { Twilio } from "twilio"

// ✅ Explicit type: Twilio | null
let twilioClient: Twilio | null = null;

if (process.env.TWILIO_ACCOUNT_SID?.startsWith("AC") && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
} else {
  console.warn("⚠️ Twilio not configured - SMS feature disabled")
}

export async function POST(req: Request) {
  if (!twilioClient) {
    return NextResponse.json(
      { error: "SMS service is disabled because Twilio keys are missing" },
      { status: 200 }
    )
  }

  try {
    const { to, body } = await req.json()

    if (!to || !body) {
      return NextResponse.json({ error: "Recipient phone number and message body are required" }, { status: 400 })
    }

    const from = process.env.TWILIO_PHONE_NUMBER

    if (!from) {
      return NextResponse.json({ error: "Twilio phone number is not configured" }, { status: 200 })
    }

    await twilioClient.messages.create({
      to,
      from,
      body,
    })

    return NextResponse.json({ message: "SMS sent successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error sending SMS:", error)
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 200 })
  }
}
