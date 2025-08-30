// app/api/razorpay/order/route.ts - COMPLETE FIXED VERSION
import { NextResponse } from "next/server"
import razorpay from "@/lib/razorpay"

export async function POST(req: Request) {
  try {
    console.log("[DEBUG] Starting order creation...")
    
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log("[DEBUG] Request body received:", body);
    } catch (parseError) {
      console.error("[DEBUG] Failed to parse request body:", parseError);
      return NextResponse.json({ 
        error: "Invalid request body format" 
      }, { status: 400 });
    }

    const { amount, currency } = body;

    // Validate required fields
    if (!amount || !currency) {
      console.error("[DEBUG] Missing required fields:", { amount: !!amount, currency: !!currency });
      return NextResponse.json({ 
        error: "Amount and currency are required" 
      }, { status: 400 });
    }

    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error("[DEBUG] Invalid amount:", amount);
      return NextResponse.json({ 
        error: "Amount must be a positive number" 
      }, { status: 400 });
    }

    // Minimum amount check (₹1.00)
    if (numericAmount < 1) {
      console.error("[DEBUG] Amount below minimum:", numericAmount);
      return NextResponse.json({ 
        error: "Minimum order amount is ₹1.00" 
      }, { status: 400 });
    }

    // Check environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("[DEBUG] Missing Razorpay credentials");
      return NextResponse.json({ 
        error: "Payment gateway configuration error" 
      }, { status: 500 });
    }

    console.log("[DEBUG] Creating Razorpay order with amount:", numericAmount);
    console.log("[DEBUG] Amount in paise:", Math.round(numericAmount * 100));

    const options = {
      amount: Math.round(numericAmount * 100), // Convert to paise, ensure integer
      currency: currency.toUpperCase(),
      receipt: `receipt_order_${Date.now()}`,
      payment_capture: 1, // auto capture payment
      notes: {
        created_at: new Date().toISOString(),
        source: "web_checkout"
      }
    };

    console.log("[DEBUG] Razorpay order options:", options);

    // Create order with Razorpay
    const order = await razorpay.orders.create(options);
    
    console.log("[DEBUG] Razorpay order created successfully:", {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });

    return NextResponse.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      receipt: order.receipt
    }, { status: 200 });

  } catch (error) {
    console.error("[DEBUG] Error creating Razorpay order:", error);
    
    // Log specific error details
    if (error instanceof Error) {
      console.error("[DEBUG] Error message:", error.message);
      console.error("[DEBUG] Error stack:", error.stack);
    }

    // Check if it's a Razorpay specific error
    if (error && typeof error === 'object' && 'error' in error) {
      const razorpayError = error as any;
      console.error("[DEBUG] Razorpay error details:", razorpayError.error);
      
      return NextResponse.json({ 
        error: "Payment gateway error",
        details: razorpayError.error?.description || "Failed to create payment order",
        code: razorpayError.error?.code || "UNKNOWN_ERROR"
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: "Failed to create Razorpay order",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}
