// app/admin/dashboard/page.tsx - FIXED VERSION WITH ORDER MANAGEMENT

'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Import UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

import { AddProductForm } from "@/components/add-product-form";
import { DeleteProductButton } from "@/components/delete-product-button";
import { CreateCouponForm } from "@/components/create-coupon-form";
import type { Product, Coupon } from "@/lib/types";

// Enhanced Order interface with customer details
interface Order {
  id: string;
  totalAmount: number;
  status: 'pending' | 'completed' | 'shipped' | 'cancelled';
  createdAt: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  
  // Customer details from checkout
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    notes?: string;
  };
  
  // Order items
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    customSize?: string;
  }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

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
        const ordersData = await orderRes.json();

        // Handle both array and object responses
        const ordersArray: Order[] = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);

        setProducts(products);
        setCoupons(coupons);
        setOrders(ordersArray);

        // Calculate earnings from completed orders
        const completedOrders = ordersArray.filter(o => o.status === 'completed' || o.status === 'shipped');
        setTotalEarnings(completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard data";
        console.error('Dashboard error:', err);
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, [status, session, router]);

  // Handle order status updates
  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'shipped' | 'completed' | 'cancelled') => {
    setUpdatingOrder(orderId);
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}`,
      });

    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  // Handle order deletion
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    setUpdatingOrder(orderId);
    try {
      const response = await fetch('/api/orders', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Remove from local state
      setOrders(prev => prev.filter(order => order.id !== orderId));

      toast({
        title: "Order Deleted",
        description: "Order has been successfully deleted",
      });

    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}. Check your API endpoints and database connection.</div>;

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          {session?.user && (
            <p className="text-lg text-muted-foreground">
              Welcome, {session.user.name || session.user.email}! (Role: {session.user.role})
            </p>
          )}
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOutIcon className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From completed orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Management */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Management</CardTitle>
          <CardDescription>View and manage all orders with customer details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {order.customerName || `${order.shippingAddress?.firstName} ${order.shippingAddress?.lastName}` || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.customerEmail || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              {item.productName} (×{item.quantity})
                              {item.customSize && ` - ${item.customSize}`}
                            </div>
                          )) || (
                            <span className="text-muted-foreground">No items data</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.customerPhone || order.shippingAddress?.phone || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{order.totalAmount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'completed' ? 'default' :
                          order.status === 'shipped' ? 'secondary' :
                          order.status === 'pending' ? 'destructive' : 'outline'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                              disabled={updatingOrder === order.id}
                            >
                              Ship
                            </Button>
                          )}
                          {order.status === 'shipped' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                              disabled={updatingOrder === order.id}
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={updatingOrder === order.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
                        src={product.images[0] || "/placeholder.svg?height=64&width=64"}
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
                      <Badge variant={coupon.isActive ? "default" : "secondary"}>
                        {coupon.isActive ? "Active" : "Inactive"}
                      </Badge>
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

// Icon Components
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

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}