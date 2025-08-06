"use client"

import type React from "react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function CreateCouponForm() {
  const [code, setCode] = useState("")
  const [type, setType] = useState<"percentage" | "fixed">("percentage")
  const [value, setValue] = useState("")
  const [usageLimit, setUsageLimit] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    const newCoupon = {
      code: code.trim().toUpperCase(),
      type,
      value: Number.parseFloat(value),
      usageLimit: usageLimit ? Number.parseInt(usageLimit) : undefined,
      // ADD THE DATE FIELDS
      validFrom,
      validUntil,
    }

    if (!newCoupon.code || isNaN(newCoupon.value)) {
      toast({
        title: "Invalid Input",
        description: "Please provide a valid code and value.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // ADD DATE VALIDATION
    if (!validFrom || !validUntil) {
      toast({
        title: "Invalid Input",
        description: "Please provide valid from and until dates.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // CHECK DATE LOGIC
    if (new Date(validFrom) >= new Date(validUntil)) {
      toast({
        title: "Invalid Dates",
        description: "Valid until date must be after valid from date.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    const response = await fetch("/api/coupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newCoupon),
    })

    setLoading(false)

    if (response.ok) {
      toast({
        title: "Coupon Created!",
        description: `Coupon "${newCoupon.code}" has been successfully added.`,
      })
      // RESET ALL FIELDS INCLUDING DATES
      setCode("")
      setValue("")
      setUsageLimit("")
      setValidFrom("")
      setValidUntil("")
      setType("percentage")
      router.refresh() // Revalidate data to show new coupon
    } else {
      const data = await response.json()
      toast({
        title: "Failed to Create Coupon",
        description: data.error || "Something went wrong.",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 p-4 border rounded-lg bg-secondary">
      <h3 className="text-lg font-semibold">Create New Coupon Code</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="couponCode">Coupon Code</Label>
          <Input
            id="couponCode"
            placeholder="SUMMER20"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="couponType">Discount Type</Label>
          <Select value={type} onValueChange={(value: "percentage" | "fixed") => setType(value)}>
            <SelectTrigger id="couponType">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="couponValue">Discount Value</Label>
          <Input
            id="couponValue"
            type="number"
            step="0.01"
            placeholder={type === "percentage" ? "10 (for 10%)" : "50 (for ₹50)"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="usageLimit">Usage Limit (Optional)</Label>
          <Input
            id="usageLimit"
            type="number"
            placeholder="e.g., 100"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">Leave empty for unlimited usage.</p>
        </div>
      </div>

      {/* ADD DATE FIELDS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validFrom">Valid From</Label>
          <Input
            id="validFrom"
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validUntil">Valid Until</Label>
          <Input
            id="validUntil"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating Coupon..." : "Create Coupon"}
      </Button>
    </form>
  )
}
