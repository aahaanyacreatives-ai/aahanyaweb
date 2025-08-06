import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`)
    const digest = shasum.digest("hex")

    if (digest === razorpay_signature) {
      return NextResponse.json({ message: "Payment successful and verified" }, { status: 200 })
    } else {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error)
    return NextResponse.json({ error: "Internal server error during verification" }, { status: 500 })
  }
}
