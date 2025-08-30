'use client';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ShippingInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customSize?: string | null;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  shippedAt?: string;
  deliveredAt?: string;
  paymentStatus: 'pending' | 'success' | 'failed';
  shippingInfo: ShippingInfo;
  trackingId?: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [showShipped, setShowShipped] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Order;
    direction: 'asc' | 'desc';
  }>({
    key: 'orderDate',
    direction: 'desc'
  });
  
  const { toast } = useToast();

  // Handle mark as shipped
  const handleShipOrder = async (order: Order) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action: 'shipped'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      // Update local state
      setOrders(current => 
        current.map(o => o.id === order.id 
          ? { ...o, status: 'shipped', shippedAt: new Date().toISOString() }
          : o
        )
      );

      toast({
        title: "Order Shipped",
        description: `Order ${order.id} has been marked as shipped`,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (order: Order) => {
    try {
      const res = await fetch(`/api/admin/orders?orderId=${order.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete order');
      }

      // Update local state
      setOrders(current => current.filter(o => o.id !== order.id));
      setOrderToDelete(null);

      toast({
        title: "Order Deleted",
        description: `Order ${order.id} has been deleted`,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete order';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Fetch orders with auto-refresh
  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/orders');
        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        toast({
          title: "Error fetching orders",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  // Sort orders
  const sortedOrders = [...orders].sort((a, b) => {
    if (sortConfig.key === 'orderDate') {
      const dateA = new Date(a[sortConfig.key]).getTime();
      const dateB = new Date(b[sortConfig.key]).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    if (sortConfig.key === 'totalAmount') {
      return sortConfig.direction === 'asc' 
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    }
    
    const valueA = String(a[sortConfig.key]);
    const valueB = String(b[sortConfig.key]);
    return sortConfig.direction === 'asc'
      ? valueA.localeCompare(valueB)
      : valueB.localeCompare(valueA);
  });

  // Handle sort
  const handleSort = (key: keyof Order) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSortIcon = (key: keyof Order) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // Loading and error states
  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading orders...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orders Management</h1>
        <div className="flex items-center gap-4">
          <Button
            variant={showShipped ? "outline" : "default"}
            onClick={() => setShowShipped(false)}
          >
            Active Orders
          </Button>
          <Button
            variant={showShipped ? "default" : "outline"}
            onClick={() => setShowShipped(true)}
          >
            Shipped Orders
          </Button>
          <div className="text-sm text-gray-500 ml-4">
            Total: {orders.length} | 
            Shipped: {orders.filter(o => o.status === 'shipped').length} | 
            Pending: {orders.filter(o => o.status === 'pending').length}
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('id')}>
                Order ID {getSortIcon('id')}
              </TableHead>
              <TableHead>Customer Details</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('totalAmount')}>
                Amount {getSortIcon('totalAmount')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('orderDate')}>
                Date {getSortIcon('orderDate')}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders
              .filter(order => showShipped ? order.status === 'shipped' : order.status === 'pending')
              .map((order) => (
              <TableRow key={order.id} className="hover:bg-gray-50">
                <TableCell className="font-mono text-sm">{order.id}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{order.shippingInfo?.name || 'N/A'}</div>
                    <div className="text-gray-500">{order.shippingInfo?.phone || 'N/A'}</div>
                    <div className="text-gray-500 text-xs">{order.shippingInfo?.email || 'N/A'}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {order.items.map((item, index) => (
                      <div key={index} className="mb-1">
                        {item.quantity}x {item.name}
                        {item.customSize && <span className="text-xs text-gray-500"> ({item.customSize})</span>}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>₹{order.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.status === 'shipped' ? 'bg-green-100 text-green-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status}
                    {order.shippedAt && (
                      <span className="block text-[10px] mt-1">
                        Shipped: {formatDate(order.shippedAt)}
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell>{formatDate(order.orderDate)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View
                    </Button>
                    {order.status === 'pending' && (
                      <>
                        <Button 
                          variant="default"
                          size="sm"
                          onClick={() => handleShipOrder(order)}
                        >
                          Ship
                        </Button>
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => setOrderToDelete(order)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="grid gap-4">
              {/* Order Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <p>Order ID: {selectedOrder.id}</p>
                  <p>Status: {selectedOrder.status}</p>
                  <p>Payment Status: {selectedOrder.paymentStatus}</p>
                  <p>Date: {formatDate(selectedOrder.orderDate)}</p>
                  {selectedOrder.shippedAt && (
                    <p>Shipped Date: {formatDate(selectedOrder.shippedAt)}</p>
                  )}
                  <p>Total Amount: ₹{selectedOrder.totalAmount.toFixed(2)}</p>
                </div>
                
                {/* Customer Details */}
                <div>
                  <h3 className="font-semibold mb-2">Customer Details</h3>
                  <p>Name: {selectedOrder.shippingInfo?.name || 'N/A'}</p>
                  <p>Email: {selectedOrder.shippingInfo?.email || 'N/A'}</p>
                  <p>Phone: {selectedOrder.shippingInfo?.phone || 'N/A'}</p>
                  <p>Address: {selectedOrder.shippingInfo?.address || 'N/A'}</p>
                  <p>
                    {selectedOrder.shippingInfo?.city}
                    {selectedOrder.shippingInfo?.state && `, ${selectedOrder.shippingInfo.state}`}
                    {selectedOrder.shippingInfo?.pinCode && ` - ${selectedOrder.shippingInfo.pinCode}`}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.customSize || 'N/A'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.price.toFixed(2)}</TableCell>
                        <TableCell>₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">Total Amount:</TableCell>
                      <TableCell className="font-semibold">₹{selectedOrder.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Action Buttons */}
              {selectedOrder.status === 'pending' && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      handleShipOrder(selectedOrder);
                      setSelectedOrder(null);
                    }}
                  >
                    Mark as Shipped
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedOrder(null);
                      setOrderToDelete(selectedOrder);
                    }}
                  >
                    Delete Order
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {orderToDelete?.id}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
