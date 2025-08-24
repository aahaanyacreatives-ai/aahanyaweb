// app/admin/dashboard/page.tsx - FIXED FOR TYPESCRIPT ERRORS AND FIREBASE

'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from "next-auth/react";
import type { DefaultSession } from "next-auth";
  // FIXED: Import DefaultSession
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Import UI components individually (FIXED: No barrel import if alias not set; use shadcn/ui paths)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { TableBody } from "@/components/ui/table";
import { TableCell } from "@/components/ui/table";
import { TableHead } from "@/components/ui/table";
import { TableHeader } from "@/components/ui/table";
import { TableRow } from "@/components/ui/table";

import { AddProductForm } from "@/components/add-product-form";
import { DeleteProductButton } from "@/components/delete-product-button";
import { CreateCouponForm } from "@/components/create-coupon-form";
import type { Product, Coupon } from "@/lib/types";

// Types are now defined in /types/next-auth.d.ts

// Define Order type
interface Order {
  id: string;
  totalAmount: number;
  status: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      if (status === 'loading') return;
      if (status === 'unauthenticated' || session?.user?.role !== 'admin') {
        router.push('/login');
        return;
      }

      try {
        const [prodRes, couponRes, orderRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/coupons'),
          fetch('/api/orders'),
        ]);

        if (!prodRes.ok) throw new Error('Failed to fetch products');
        if (!couponRes.ok) throw new Error('Failed to fetch coupons');
        if (!orderRes.ok) throw new Error('Failed to fetch orders');

        const products: Product[] = await prodRes.json();
        const coupons: Coupon[] = await couponRes.json();
        const orders: Order[] = await orderRes.json();

        setProducts(products);
        setCoupons(coupons);

        const completedOrders = orders.filter(o => o.status === 'completed');
        setTotalOrders(completedOrders.length);
        setTotalEarnings(completedOrders.reduce((sum, o) => sum + o.totalAmount, 0));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, [status, session, router]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}. Check your Firebase connection and env vars.</div>;

  return (
    <div className="grid gap-6">
      {/* Header with Title and Logout Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          {session?.user && (
            <p className="text-lg text-muted-foreground">
              Welcome, {session.user.name || session.user.email}! (Role: {session.user.role})
            </p>
          )}
        </div>
        
        {/* Logout Button */}
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOutIcon className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Updated on page reload</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">+5 new products this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">Updated on page reload</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Management */}
      <Card>
        <CardHeader>
          <CardTitle>Product Management</CardTitle>
          <CardDescription>Add, view, and delete products.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddProductForm />
          <div className="mt-8 border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-[100px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Image
                        src={product.images[0] || "/placeholder.svg?height=64&width=64&query=jewelry%20product%20admin"}
                        width={64}
                        height={64}
                        alt={product.name}
                        className="aspect-square rounded-md object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right">₹{product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <DeleteProductButton productId={product.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Coupon Management */}
      <Card>
        <CardHeader>
          <CardTitle>Coupon Management</CardTitle>
          <CardDescription>Create and view discount coupon codes.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCouponForm />
          <div className="mt-8 border rounded-lg overflow-x-auto">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium">{coupon.code}</TableCell>
                    <TableCell>{coupon.type === "percentage" ? "Percentage" : "Fixed"}</TableCell>
                    <TableCell className="text-right">
                      {coupon.type === "percentage" 
                        ? `${coupon.value || 0}%` 
                        : `₹${(coupon.value || 0).toFixed(2)}`
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      {coupon.usedCount}
                      {coupon.usageLimit !== undefined ? ` / ${coupon.usageLimit}` : " (Unlimited)"}
                    </TableCell>
                    <TableCell className="text-center">
                      {coupon.validFrom ? 
                        new Date(coupon.validFrom).toLocaleDateString('en-IN') : 
                        'Not set'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      {coupon.validUntil ? 
                        new Date(coupon.validUntil).toLocaleDateString('en-IN') : 
                        'Not set'
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Icon Components (Moved to bottom for organization)
function LogOutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function LineChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m18 6-7 6-6-6v6" />
    </svg>
  );
}

function PackageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27v.713c-.28.14-.545.31-.79.508L3 8v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-3.71-2.508c-.245-.198-.51-.368-.79-.508V4.27c0-.57-.47-1.03-1.03-1.03H8.53c-.57 0-1.03.46-1.03 1.03Z" />
      <path d="M16 8.015v.01" />
      <path d="M8 8.015v.01" />
      <path d="M12 8.015v.01" />
      <path d="M3 8h18" />
      <path d="M12 22v-5" />
      <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  );
}

function ShoppingCartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
