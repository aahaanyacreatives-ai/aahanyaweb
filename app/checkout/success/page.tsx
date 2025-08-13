"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const params = useSearchParams()
  
  // Optional: Get order ID from query param
  const orderId = params.get("orderId")

  // Optionally redirect to my-orders automatically after few seconds
  useEffect(() => {
    const t = setTimeout(() => {
      router.push("/my-orders")
    }, 6000) // 6 seconds

    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center space-y-6">
      <h1 className="text-3xl font-bold text-green-600">Order Confirmed 🎉</h1>
      <p className="text-lg">Thank you for shopping with Aahaanya Creatives.</p>
      <p className="text-md">Your order{orderId ? ` #${orderId}` : ""} has been placed successfully.</p>
      <Link href="/my-orders">
        <Button>View My Orders</Button>
      </Link>
      <p className="text-gray-500 text-sm">You will be redirected to your orders in a few seconds...</p>
    </div>
  )
}
