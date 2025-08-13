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
import { useState, useEffect, useMemo, useTransition } from "react"  // Added useTransition
import { useSession } from "next-auth/react"
import type { Coupon } from "@/lib/types"
import { createOrder } from "@/app/actions/order"  // Added import for server action

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

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart()
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
  const [phone, setPhone] = useState("") // Capture phone number
  const [notes, setNotes] = useState("")

  const [isPending, startTransition] = useTransition()  // Added for server action handling

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cartItems])
  const shipping = 10.0

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
    script.onload = () => setRazorpayLoaded(true)
    script.onerror = () => {
      toast({
        title: "Payment Error",
        description: "Failed to load Razorpay script. Please try again.",
        variant: "destructive",
      })
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
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

    if (status !== "authenticated" || !session?.user?.id) {
      toast({
        title: "Login Required",
        description: "Please log in to place an order.",
        variant: "destructive",
      })
      router.push("/login")
      setLoading(false)
      return
    }

    if (!razorpayLoaded) {
      toast({
        title: "Payment Error",
        description: "Razorpay script not loaded yet. Please wait a moment and try again.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    if (cartItems.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to your cart before proceeding to checkout.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Basic validation for shipping info
    if (!firstName || !lastName || !address || !city || !state || !zip || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required shipping details.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      // 1. Create order on your backend
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

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || "Failed to create Razorpay order.")
      }

      const order = await orderResponse.json()

      // 2. Configure Razorpay Checkout options
      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "YOUR_RAZORPAY_KEY_ID",
        amount: Math.round(order.amount).toString(),
        currency: order.currency,
        name: "Aahaanya Creatives",
        description: "Purchase from Aahaanya Creatives",
        order_id: order.id,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyResponse = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(response),
            })

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json()
              throw new Error(errorData.error || "Payment verification failed.")
            }

            if (appliedCoupon) {
              await fetch("/api/coupons", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: appliedCoupon.id }),
              })
            }

            // Use server action for order creation
            startTransition(async () => {
              try {
                const orderItems = cartItems.map((item) => ({
                  productId: item.product.id,
                  name: item.product.name,
                  image: (item.product.images && item.product.images.length > 0)
            ? item.product.images[0]
            : "", 
                  price: item.product.price,
                  quantity: item.quantity,
                  customSize: item.customSize,
                  customImage: item.customImage,
                }))

                await createOrder({
                  userId: session.user.id,
                  items: orderItems,
                  totalAmount: total,
                  status: "completed",
                  paymentDetails: response,
                })

                toast({
                  title: "Order Placed!",
                  description: "Your order has been successfully placed. Thank you for your purchase!",
                })
                clearCart()
                setAppliedCoupon(null)
                setCouponCode("")

                // Send SMS confirmation
                const smsMessage = `Aahaanya Creatives: Your order ${order.id} has been confirmed! Total: ₹${(total||0).toFixed(2)}. Thank you for your purchase!`
                try {
                  const smsResponse = await fetch("/api/send-sms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ to: phone, body: smsMessage }),
                  })
                  if (smsResponse.ok) {
                    toast({ title: "SMS Sent", description: "Order confirmation SMS sent to your phone." })
                  } else {
                    const smsErrorData = await smsResponse.json()
                    console.error("Failed to send SMS:", smsErrorData.error)
                    toast({
                      title: "SMS Failed",
                      description: "Could not send order confirmation SMS.",
                      variant: "destructive",
                    })
                  }
                } catch (smsError) {
                  console.error("Error calling SMS API:", smsError)
                  toast({
                    title: "SMS Failed",
                    description: "Error sending order confirmation SMS.",
                    variant: "destructive",
                  })
                }

                router.push(`/checkout/success?orderId=${encodeURIComponent(order.id || "")}`)
              } catch (orderError: any) {
                console.error("Order creation error:", orderError)
                toast({
                  title: "Order Failed",
                  description: orderError.message || "Failed to create order. Please try again.",
                  variant: "destructive",
                })
              } finally {
                setLoading(false)
              }
            })
          } catch (verificationError: any) {
            console.error("Payment verification error:", verificationError)
            toast({
              title: "Payment Failed",
              description: verificationError.message || "Payment verification failed. Please contact support.",
              variant: "destructive",
            })
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

      const rzp1 = new window.Razorpay(options)
      rzp1.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response.error)
        toast({
          title: "Payment Failed",
          description: response.error.description || "Your payment could not be processed.",
          variant: "destructive",
        })
        setLoading(false)
      })
      rzp1.open()
    } catch (error: any) {
      console.error("Checkout process error:", error)
      toast({
        title: "Checkout Error",
        description: error.message || "Something went wrong during checkout. Please try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

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
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Shipping Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading || isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading || isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="123 Main St"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading || isPending}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Anytown" required value={city} onChange={(e) => setCity(e.target.value)} disabled={loading || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="CA" required value={state} onChange={(e) => setState(e.target.value)} disabled={loading || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip Code</Label>
              <Input id="zip" placeholder="12345" required value={zip} onChange={(e) => setZip(e.target.value)} disabled={loading || isPending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9876543210"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading || isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Order Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Leave at front door"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading || isPending}
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Payment Information</h2>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select defaultValue="razorpay" disabled={loading || isPending}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select a payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="razorpay">Razorpay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="couponCode">Discount Coupon</Label>
            <div className="flex gap-2">
              <Input
                id="couponCode"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon || loading || isPending}
              />
              <Button onClick={handleApplyCoupon} type="button" disabled={!!appliedCoupon || loading || isPending}>
                Apply
              </Button>
            </div>
            {appliedCoupon && (
              <p className="text-sm text-green-600">
                Coupon "{appliedCoupon.code}" applied! (
                {appliedCoupon.type === "percentage" ? `${appliedCoupon.value}%` : `₹${appliedCoupon.value}`})
              </p>
            )}
          </div>

          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-2xl font-bold">Order Summary</h2>
            <div className="flex justify-between">
              <span>Subtotal ({cartItems.length} items)</span>
              <span>₹{(subtotal||0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>₹{(shipping||0).toFixed(2)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({appliedCoupon.code})</span>
                <span>
                  -₹
                  {(appliedCoupon.type === "percentage"
                    ? subtotal * (appliedCoupon.value / 100)
                    : (appliedCoupon.value||0)
                  ).toFixed(2)}
                </span>
              </div>
            )}
            <div className="border-t pt-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{(total||0).toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full" disabled={loading || isPending || !razorpayLoaded}>
              {loading || isPending ? "Processing Payment..." : "Pay with Razorpay"}
            </Button>
            {!razorpayLoaded && <p className="text-sm text-center text-muted-foreground">Loading payment gateway...</p>}
            <p className="text-sm text-muted-foreground text-center">
              By placing your order, you agree to our Terms and Conditions.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
