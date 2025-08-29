//C:\Users\Asus\OneDrive\Desktop\Aahanya\app\api\razorpay\order\route.ts
import { NextResponse } from "next/server"
import razorpay from "@/lib/razorpay"

export async function POST(req: Request) {
  try {
    const { amount, currency } = await req.json()

    if (!amount || !currency) {
      return NextResponse.json({ error: "Amount and currency are required" }, { status: 400 })
    }

    const options = {
      amount: amount * 100, // amount in smallest currency unit (e.g., paise for INR)
      currency,
      receipt: `receipt_order_${Date.now()}`,
      payment_capture: 1, // auto capture payment
    }

    const order = await razorpay.orders.create(options)
    return NextResponse.json(order, { status: 200 })
  } catch (error) {
    console.error("Error creating Razorpay order:", error)
    return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 500 })
  }
}
