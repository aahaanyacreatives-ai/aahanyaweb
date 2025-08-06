'use client';
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Coupon {
  id?: string;
  _id?: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  usedCount: number;
  usageLimit?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/coupons");
      if (!res.ok) throw new Error("Failed to fetch coupons");
      const data = await res.json();
      setCoupons(data.data || data);
    } catch (err) {
      setError("Error loading coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const deleteCoupon = async (id: string) => {
    try {
      const res = await fetch(`/api/coupons?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => (c.id || c._id) !== id));
      } else {
        alert("Failed to delete coupon");
      }
    } catch {
      alert("Coupon delete failed");
    }
  };

  if (loading) return <div>Loading coupons...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Coupons Management</h1>
      <div className="border rounded-lg overflow-x-auto mt-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="text-center">Usage</TableHead>
              <TableHead className="text-center">Valid Until</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id || coupon._id}>
                <TableCell className="font-medium font-mono">
                  {coupon.code}
                </TableCell>
                <TableCell>
                  {coupon.type === "percentage" ? "Percentage" : "Fixed"}
                </TableCell>
                <TableCell>
                  {coupon.type === "percentage" 
                    ? `${coupon.value || 0}%` 
                    : `₹${(coupon.value || 0).toFixed(2)}`
                  }
                </TableCell>
                <TableCell className="text-center">
                  {coupon.usedCount || 0}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " (Unlimited)"}
                </TableCell>
                <TableCell className="text-center">
                  {coupon.validUntil ? 
                    new Date(coupon.validUntil).toLocaleDateString('en-IN') : 
                    'No expiry'
                  }
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      coupon.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {coupon.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="destructive"
                    onClick={() => deleteCoupon(coupon.id || coupon._id!)}
                  >
                    Delete
                  </Button>
                  {/* Edit functionality yahan add kar sakte ho */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
