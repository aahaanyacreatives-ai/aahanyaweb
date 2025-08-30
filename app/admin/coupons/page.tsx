// app/admin/coupons/page.tsx - COMPLETE FIXED VERSION

'use client';

import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CreateCouponForm } from "@/components/create-coupon-form";
import type { Coupon } from "@/lib/types";

export default function CouponsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<string | null>(null);
  const [updatingCoupon, setUpdatingCoupon] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoupons() {
      if (status === 'loading') return;
      if (status === 'unauthenticated' || session?.user?.role !== 'admin') {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/coupons');
        
        if (!response.ok) {
          throw new Error('Failed to fetch coupons');
        }

        const data = await response.json();
        
        let couponsArray: Coupon[] = [];
        
        console.log('Raw coupon response:', data);
        
        if (Array.isArray(data)) {
          couponsArray = data;
        } else if (data && data.coupons && Array.isArray(data.coupons)) {
          couponsArray = data.coupons;
        } else if (data && data.data && Array.isArray(data.data)) {
          couponsArray = data.data;
        } else if (data && typeof data === 'object' && data.id) {
          couponsArray = [data];
        } else {
          console.warn('Unexpected coupon data format:', data);
          couponsArray = [];
        }

        console.log('Processed coupons array:', couponsArray);
        setCoupons(couponsArray);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load coupons";
        console.error('Coupons fetch error:', err);
        setError(message);
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCoupons();
  }, [status, session, router]);

  // ✅ FIXED: Handle coupon deletion with query parameter
  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      return;
    }

    setDeletingCoupon(couponId);
    try {
      // Send ID as query parameter to match API expectation
      const response = await fetch(`/api/coupons?id=${encodeURIComponent(couponId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete coupon' }));
        throw new Error(errorData.error || 'Failed to delete coupon');
      }

      // Remove from local state
      setCoupons(prev => prev.filter(coupon => coupon.id !== couponId));

      toast({
        title: "Coupon Deleted",
        description: "Coupon has been successfully deleted",
      });

    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete coupon",
        variant: "destructive",
      });
    } finally {
      setDeletingCoupon(null);
    }
  };

  // ✅ FIXED: Handle coupon toggle with correct API structure
  const handleToggleCoupon = async (couponId: string, currentStatus: boolean) => {
    setUpdatingCoupon(couponId);
    try {
      const response = await fetch('/api/coupons', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: couponId, 
          updateData: {
            isActive: !currentStatus 
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update coupon' }));
        throw new Error(errorData.error || 'Failed to update coupon');
      }

      // Update local state
      setCoupons(prev => prev.map(coupon => 
        coupon.id === couponId 
          ? { ...coupon, isActive: !currentStatus }
          : coupon
      ));

      toast({
        title: "Coupon Updated",
        description: `Coupon ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

    } catch (error) {
      console.error('Error updating coupon:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update coupon",
        variant: "destructive",
      });
    } finally {
      setUpdatingCoupon(null);
    }
  };

  // Refresh coupons (useful after creating new coupon)
  const refreshCoupons = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/coupons');
      if (!response.ok) throw new Error('Failed to fetch coupons');
      
      const data = await response.json();
      let couponsArray: Coupon[] = [];
      
      if (Array.isArray(data)) {
        couponsArray = data;
      } else if (data && data.coupons && Array.isArray(data.coupons)) {
        couponsArray = data.coupons;
      } else if (data && data.data && Array.isArray(data.data)) {
        couponsArray = data.data;
      }
      
      setCoupons(couponsArray);
    } catch (err) {
      console.error('Error refreshing coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading coupons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-bold mb-2">Error Loading Coupons</h2>
          <p>{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Coupon Management</h1>
          <p className="text-muted-foreground">Create and manage discount coupons</p>
        </div>
        <Button onClick={refreshCoupons} variant="outline" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Create Coupon Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Coupon</CardTitle>
          <CardDescription>Add new discount coupons for your customers</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCouponForm />
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Coupons ({coupons.length})</CardTitle>
          <CardDescription>View and manage existing coupons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-center">Usage</TableHead>
                  <TableHead className="text-center">Valid From</TableHead>
                  <TableHead className="text-center">Valid Until</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!coupons || !Array.isArray(coupons) || coupons.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="text-2xl">🎫</div>
                        <p className="text-lg font-medium">No coupons found</p>
                        <p className="text-sm">Create your first coupon using the form above</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => {
                    // Generate safe key for React
                    const safeKey = coupon.id || `coupon-${coupon.code}-${Date.now()}`;
                    
                    return (
                      <TableRow key={safeKey}>
                        <TableCell className="font-medium font-mono">
                          {coupon.code}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {coupon.type === "percentage" ? "Percentage" : "Fixed Amount"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {coupon.type === "percentage" 
                            ? `${coupon.value || 0}%` 
                            : `₹${(coupon.value || 0).toFixed(2)}`
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm">
                            <span className="font-medium">{coupon.usedCount || 0}</span>
                            {coupon.usageLimit !== undefined && coupon.usageLimit !== null 
                              ? <span className="text-muted-foreground"> / {coupon.usageLimit}</span>
                              : <span className="text-muted-foreground"> / ∞</span>
                            }
                          </div>
                          {coupon.usageLimit && coupon.usedCount >= coupon.usageLimit && (
                            <div className="text-xs text-red-500 mt-1">Limit Reached</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {coupon.validFrom ? 
                            new Date(coupon.validFrom.toDate?.() || coupon.validFrom).toLocaleDateString('en-IN') : 
                            <span className="text-muted-foreground">Not set</span>
                          }
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {coupon.validUntil ? 
                            new Date(coupon.validUntil.toDate?.() || coupon.validUntil).toLocaleDateString('en-IN') : 
                            <span className="text-muted-foreground">Not set</span>
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={coupon.isActive ? "default" : "secondary"}>
                            {coupon.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            {coupon.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant={coupon.isActive ? "secondary" : "default"}
                                  onClick={() => handleToggleCoupon(coupon.id!, coupon.isActive)}
                                  disabled={updatingCoupon === coupon.id || deletingCoupon === coupon.id}
                                >
                                  {updatingCoupon === coupon.id 
                                    ? "..." 
                                    : coupon.isActive ? "Deactivate" : "Activate"
                                  }
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteCoupon(coupon.id!)}
                                  disabled={deletingCoupon === coupon.id || updatingCoupon === coupon.id}
                                >
                                  {deletingCoupon === coupon.id ? "Deleting..." : "Delete"}
                                </Button>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-sm px-2 py-1 rounded bg-muted">
                                No ID
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {coupons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Coupon Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{coupons.length}</div>
                <div className="text-sm text-muted-foreground">Total Coupons</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {coupons.filter(c => c.isActive).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Coupons</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Usage</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {coupons.filter(c => c.type === 'percentage').length}
                </div>
                <div className="text-sm text-muted-foreground">Percentage Coupons</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
