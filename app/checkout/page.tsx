"use client"

import Link from "next/link"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCart } from "@/components/cart-provider"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import type { Coupon } from "@/lib/types"

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key: string
  amount: string
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color: string
  }
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open: () => void
  on: (eventName: string, callback: (response: any) => void) => void
}

// Define the Product type
interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
}

// Define the CartItem type
interface CartItem {
  product: Product;
  quantity: number;
  customSize?: string;
  customImage?: string;
}

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart() as { cartItems: CartItem[], clearCart: () => void }
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)

  // State for shipping information
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cartItems])
  const shipping = 50.0

  // Calculate total with discount
  const total = useMemo(() => {
    let currentTotal = subtotal + shipping
    if (appliedCoupon) {
      if (appliedCoupon.type === "percentage") {
        currentTotal -= currentTotal * (appliedCoupon.value / 100)
      } else if (appliedCoupon.type === "fixed") {
        currentTotal -= appliedCoupon.value
      }
      currentTotal = Math.max(0, currentTotal)
    }
    return currentTotal
  }, [subtotal, shipping, appliedCoupon])

  // Dynamically load Razorpay script
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => {
      console.log("Razorpay script loaded successfully")
      setRazorpayLoaded(true)
    }
    script.onerror = () => {
      console.error("Failed to load Razorpay script")
      toast({
        title: "Payment Error",
        description: "Failed to load payment gateway. Please refresh and try again.",
        variant: "destructive",
      })
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Invalid Coupon",
        description: "Please enter a coupon code.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/coupons?code=${encodeURIComponent(couponCode.trim())}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Invalid or expired coupon code.")
      }
      const coupon: Coupon = await response.json()

      if (!coupon.isActive) {
        throw new Error("Coupon is not active.")
      }
      if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
        throw new Error("Coupon has reached its usage limit.")
      }

      setAppliedCoupon(coupon)
      toast({
        title: "Coupon Applied!",
        description: `Discount of ${coupon.type === "percentage" ? `${coupon.value}%` : `₹${coupon.value}`} applied.`,
      })
    } catch (error: any) {
      setAppliedCoupon(null)
      toast({
        title: "Coupon Error",
        description: error.message || "Failed to apply coupon.",
        variant: "destructive",
      })
    }
  }

  const handlePlaceOrder = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    console.log("[DEBUG] Starting checkout process...")
    console.log("[DEBUG] Session status:", status)
    console.log("[DEBUG] User ID:", session?.user?.id)
    console.log("[DEBUG] Cart items count:", cartItems.length)
    console.log("[DEBUG] Total amount:", total)

    // Authentication check
    if (status !== "authenticated" || !session?.user?.id) {
      console.error("[DEBUG] User not authenticated")
      toast({
        title: "Login Required",
        description: "Please log in to place an order.",
        variant: "destructive",
      })
      router.push("/login")
      setLoading(false)
      return
    }

    // Razorpay script check
    if (!razorpayLoaded || !window.Razorpay) {
      console.error("[DEBUG] Razorpay not loaded")
      toast({
        title: "Payment Error",
        description: "Payment gateway not ready. Please wait a moment and try again.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Cart validation
    if (cartItems.length === 0) {
      console.error("[DEBUG] Cart is empty")
      toast({
        title: "Cart Empty",
        description: "Please add items to your cart before proceeding to checkout.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Form validation
    if (!firstName || !lastName || !address || !city || !state || !zip || !phone) {
      console.error("[DEBUG] Missing shipping information")
      toast({
        title: "Missing Information",
        description: "Please fill in all required shipping details.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      console.log("[DEBUG] Creating Razorpay order...")
      
      // 1. Create Razorpay order
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: total,
          currency: "INR",
        }),
      })

      console.log("[DEBUG] Razorpay order response status:", orderResponse.status)

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        console.error("[DEBUG] Razorpay order creation failed:", errorData)
        throw new Error(errorData.error || "Failed to create payment order.")
      }

      const razorpayOrder = await orderResponse.json()
      console.log("[DEBUG] Razorpay order created:", razorpayOrder.id)

      // 2. Configure and open Razorpay Checkout
      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: Math.round(razorpayOrder.amount).toString(),
        currency: razorpayOrder.currency,
        name: "Aahaanya Creatives",
        description: "Purchase from Aahaanya Creatives",
        order_id: razorpayOrder.id,
        handler: async (response: RazorpayResponse) => {
          try {
            console.log("[DEBUG] Payment successful, starting verification...")
            console.log("[DEBUG] Payment response:", {
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature?.substring(0, 10) + "..."
            })

            // Step 1: Verify payment
            const verifyResponse = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(response),
            })

            console.log("[DEBUG] Payment verification response status:", verifyResponse.status)

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json()
              console.error("[DEBUG] Payment verification failed:", errorData)
              throw new Error(errorData.error || "Payment verification failed.")
            }

            const verifyResult = await verifyResponse.json()
            console.log("[DEBUG] Payment verified successfully:", verifyResult)

            // Step 2: Create order in database
            const shippingInfo = {
              firstName,
              lastName,
              address,
              city,
              state,
              zip,
              phone,
              notes
            }

            console.log("[DEBUG] Creating order with shipping info...")

            const createOrderResponse = await fetch("/api/orders", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ shippingInfo }),
            })

            console.log("[DEBUG] Order creation response status:", createOrderResponse.status)

            if (!createOrderResponse.ok) {
              const errorData = await createOrderResponse.json()
              console.error("[DEBUG] Order creation failed:", errorData)
              throw new Error(errorData.error || "Failed to create order.")
            }

            const orderResult = await createOrderResponse.json()
            console.log("[DEBUG] Order created successfully:", orderResult.order?.id)

            // Step 3: Update order with payment details
            console.log("[DEBUG] Updating order with payment details...")

            const updateResponse = await fetch("/api/orders", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                orderId: orderResult.order.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            console.log("[DEBUG] Order update response status:", updateResponse.status)

            if (!updateResponse.ok) {
              const errorData = await updateResponse.json()
              console.error("[DEBUG] Order update failed:", errorData)
              throw new Error(errorData.error || "Failed to update order with payment details.")
            }

            const updateResult = await updateResponse.json()
            console.log("[DEBUG] Order updated successfully")

            // Step 4: Apply coupon usage if exists
            if (appliedCoupon) {
              console.log("[DEBUG] Updating coupon usage...")
              try {
                await fetch("/api/coupons", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: appliedCoupon.id }),
                })
              } catch (couponError) {
                console.error("[DEBUG] Coupon update failed:", couponError)
                // Don't fail the entire process for coupon update failure
              }
            }

            // Step 5: Send SMS confirmation
            const smsMessage = `Aahaanya Creatives: Your order ${orderResult.order.id} has been confirmed! Total: ₹${total.toFixed(2)}. Thank you for your purchase!`
            try {
              console.log("[DEBUG] Sending SMS confirmation...")
              const smsResponse = await fetch("/api/send-sms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: phone, body: smsMessage }),
              })
              if (smsResponse.ok) {
                console.log("[DEBUG] SMS sent successfully")
                toast({ 
                  title: "SMS Sent", 
                  description: "Order confirmation SMS sent to your phone." 
                })
              } else {
                const smsErrorData = await smsResponse.json()
                console.error("[DEBUG] SMS send failed:", smsErrorData)
              }
            } catch (smsError) {
              console.error("[DEBUG] SMS API error:", smsError)
              // Don't fail the entire process for SMS failure
            }

            // Step 6: Success actions
            toast({
              title: "Order Placed Successfully!",
              description: "Your order has been confirmed. You will receive an email confirmation shortly.",
            })

            // Clear cart and reset form
            clearCart()
            setAppliedCoupon(null)
            setCouponCode("")
            
            // Reset form fields
            setFirstName("")
            setLastName("")
            setAddress("")
            setCity("")
            setState("")
            setZip("")
            setPhone("")
            setNotes("")

            console.log("[DEBUG] Redirecting to success page...")
            router.push(`/checkout/success?orderId=${encodeURIComponent(orderResult.order.id)}`)
            
          } catch (error: any) {
            console.error("[DEBUG] Payment processing error:", error)
            toast({
              title: "Payment Processing Failed",
              description: error.message || "Failed to process your payment. Please contact support if the amount was deducted.",
              variant: "destructive",
            })
          } finally {
            setLoading(false)
          }
        },
        prefill: {
          name: `${firstName} ${lastName}`,
          email: session.user.email || "customer@example.com",
          contact: phone,
        },
        notes: {
          address: `${address}, ${city}, ${state} - ${zip}`,
          orderNotes: notes,
        },
        theme: {
          color: "#F43F5E",
        },
      }

      console.log("[DEBUG] Opening Razorpay checkout...")
      const rzp1 = new window.Razorpay(options)
      
      rzp1.on("payment.failed", (response: any) => {
        console.error("[DEBUG] Razorpay payment failed:", response.error)
        toast({
          title: "Payment Failed",
          description: response.error.description || "Your payment could not be processed. Please try again.",
          variant: "destructive",
        })
        setLoading(false)
      })

      // Handle payment modal closure without payment
      rzp1.on("payment.cancel", () => {
        console.log("[DEBUG] Payment cancelled by user")
        toast({
          title: "Payment Cancelled",
          description: "Payment was cancelled. You can try again when ready.",
          variant: "destructive",
        })
        setLoading(false)
      })

      rzp1.open()

    } catch (error: any) {
      console.error("[DEBUG] Checkout initialization error:", error)
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  // Show loading state while session is loading
  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 text-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Loading...</h1>
          <p className="text-lg text-gray-500">Please wait while we load your checkout page.</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  // Show empty cart message
  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12 text-center space-y-4">
        <h1 className="text-3xl font-bold">Your Cart is Empty</h1>
        <p className="text-lg text-gray-500">Please add items to your cart before proceeding to checkout.</p>
        <Link href="/" passHref>
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>
      <form onSubmit={handlePlaceOrder} className="grid gap-8 lg:grid-cols-2">
        {/* Shipping Information Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Shipping Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="John"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              placeholder="123 Main Street, Apartment 4B"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input 
                id="city" 
                placeholder="Mumbai" 
                required 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                disabled={loading} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input 
                id="state" 
                placeholder="Maharashtra" 
                required 
                value={state} 
                onChange={(e) => setState(e.target.value)} 
                disabled={loading} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Pin Code *</Label>
              <Input 
                id="zip" 
                placeholder="400001" 
                required 
                value={zip} 
                onChange={(e) => setZip(e.target.value)} 
                disabled={loading} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9876543210"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Order Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Special delivery instructions, gift message, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </div>

        {/* Payment and Order Summary Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Payment Information</h2>
          
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select defaultValue="razorpay" disabled={loading}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select a payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="razorpay">Razorpay (Cards, UPI, Netbanking)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Coupon Section */}
          <div className="space-y-2">
            <Label htmlFor="couponCode">Discount Coupon</Label>
            <div className="flex gap-2">
              <Input
                id="couponCode"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon || loading}
              />
              <Button 
                onClick={handleApplyCoupon} 
                type="button" 
                disabled={!!appliedCoupon || loading}
                variant="outline"
              >
                Apply
              </Button>
            </div>
            {appliedCoupon && (
              <div className="flex items-center justify-between p-2 bg-green-50 rounded border">
                <p className="text-sm text-green-700">
                  Coupon "{appliedCoupon.code}" applied! (
                  {appliedCoupon.type === "percentage" ? `${appliedCoupon.value}%` : `₹${appliedCoupon.value}`} off)
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAppliedCoupon(null)
                    setCouponCode("")
                  }}
                  disabled={loading}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="border rounded-lg p-6 space-y-4 bg-gray-50">
            <h2 className="text-2xl font-bold">Order Summary</h2>
            
            {/* Cart Items Preview */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cartItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">
                      Qty: {item.quantity}
                      {item.customSize && ` | Size: ${item.customSize}`}
                    </p>
                  </div>
                  <span className="font-medium">₹{(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Pricing Breakdown */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>₹{shipping.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>
                    -₹
                    {(appliedCoupon.type === "percentage"
                      ? (subtotal + shipping) * (appliedCoupon.value / 100)
                      : appliedCoupon.value
                    ).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !razorpayLoaded}
              size="lg"
            >
              {loading ? "Processing Payment..." : 
               !razorpayLoaded ? "Loading Payment Gateway..." : 
               `Pay ₹${total.toFixed(2)} with Razorpay`}
            </Button>

            {/* Status Messages */}
            {!razorpayLoaded && (
              <p className="text-sm text-center text-amber-600 bg-amber-50 p-2 rounded">
                Loading payment gateway... Please wait.
              </p>
            )}
            
            <p className="text-sm text-muted-foreground text-center">
              By placing your order, you agree to our Terms and Conditions.
              <br />
              Your payment is secured by Razorpay.
            </p>
          </div>

          {/* Debug Info (remove in production) */}
          {process.env.NODE_ENV === "development" && (
            <div className="border rounded-lg p-4 bg-gray-100 text-xs space-y-1">
              <p><strong>Debug Info:</strong></p>
              <p>Session Status: {status}</p>
              <p>User ID: {session?.user?.id || "Not found"}</p>
              <p>Cart Items: {cartItems.length}</p>
              <p>Razorpay Loaded: {razorpayLoaded ? "Yes" : "No"}</p>
              <p>Total: ₹{total.toFixed(2)}</p>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}