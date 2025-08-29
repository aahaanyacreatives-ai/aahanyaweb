// app/api/razorpay/verify-payment/route.ts - Enhanced with debugging
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    console.log("[DEBUG] Payment verification started")
    
    const body = await req.json()
    console.log("[DEBUG] Request body keys:", Object.keys(body))
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error("[DEBUG] Missing required fields:", {
        order_id: !!razorpay_order_id,
        payment_id: !!razorpay_payment_id,
        signature: !!razorpay_signature
      })
      return NextResponse.json({ 
        error: "Missing required payment verification fields" 
      }, { status: 400 })
    }

    // Check if secret key is available
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("[DEBUG] RAZORPAY_KEY_SECRET environment variable not found")
      return NextResponse.json({ 
        error: "Payment gateway configuration error" 
      }, { status: 500 })
    }

    console.log("[DEBUG] Creating HMAC signature...")
    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`)
    const digest = shasum.digest("hex")

    console.log("[DEBUG] Signature comparison:", {
      generated: digest.substring(0, 10) + "...",
      received: razorpay_signature.substring(0, 10) + "...",
      match: digest === razorpay_signature
    })

    if (digest === razorpay_signature) {
      console.log("[DEBUG] Payment verification successful")
      return NextResponse.json({ 
        message: "Payment successful and verified",
        success: true 
      }, { status: 200 })
    } else {
      console.error("[DEBUG] Payment verification failed - signature mismatch")
      return NextResponse.json({ 
        error: "Payment verification failed",
        details: "Signature verification failed"
      }, { status: 400 })
    }
  } catch (error) {
    console.error("[DEBUG] Error verifying Razorpay payment:", error)
    return NextResponse.json({ 
      error: "Internal server error during verification",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}