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
    event.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!code.trim()) {
        throw new Error("Coupon code is required");
      }

      const parsedValue = Number.parseFloat(value);
      if (isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error("Please enter a valid positive number for discount value");
      }

      if (type === "percentage" && parsedValue > 100) {
        throw new Error("Percentage discount cannot be more than 100%");
      }

      // Date validation
      if (!validFrom || !validUntil) {
        throw new Error("Please provide valid from and until dates");
      }

      const fromDate = new Date(validFrom);
      const untilDate = new Date(validUntil);
      
      if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
        throw new Error("Invalid date format");
      }

      if (fromDate >= untilDate) {
        throw new Error("Valid until date must be after valid from date");
      }

      const newCoupon = {
        code: code.trim().toUpperCase(),
        type,
        value: parsedValue,
        usageLimit: usageLimit ? Number.parseInt(usageLimit) : null,
        validFrom: fromDate.toISOString(),
        validUntil: untilDate.toISOString(),
      };

      console.log('[DEBUG] Creating coupon:', newCoupon);

      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include", // Important for auth
        body: JSON.stringify(newCoupon),
      });

      const data = await response.json();
      console.log('[DEBUG] Server response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to create coupon");
      }

      toast({
        title: "Coupon Created!",
        description: `Coupon "${newCoupon.code}" has been successfully added.`,
      });

      // Reset form
      setCode("");
      setValue("");
      setUsageLimit("");
      setValidFrom("");
      setValidUntil("");
      setType("percentage");
      
      // Refresh the page to show new coupon
      router.refresh();
      
    } catch (error) {
      console.error('[DEBUG] Coupon creation error:', error);
      
      toast({
        title: "Failed to Create Coupon",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }; // ← This closing brace was missing!

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
} // ← Removed the extra closing brace that was here
