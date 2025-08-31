'use client';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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

interface UserDetails {
  email?: string;
  name?: string;
  phone?: string;
}

interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  customSize?: string | null;
  image?: string | null;
}

interface Order {
  id: string;
  userId: string;
  userDetails?: UserDetails;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'completed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  createdAt?: string;
  updatedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  paymentStatus: 'pending' | 'success' | 'failed';
  paymentDetails?: Record<string, any>;
  shippingInfo: ShippingInfo;
  trackingId?: string;
  trackingNumber?: string;
  adminNotes?: string;
}

interface AdminOrdersResponse {
  success?: boolean;
  orders?: Order[];
  stats?: {
    total: number;
    pending: number;
    completed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    totalRevenue: number;
  };
  error?: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [showShipped, setShowShipped] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order; direction: 'asc' | 'desc'; }>({ key: 'orderDate', direction: 'desc' });
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/orders', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      const data: AdminOrdersResponse = await res.json();
      if (data.success !== false && data.orders) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(errorMessage);
      toast({
        title: "Error fetching orders",
        description: errorMessage,
        variant: "destructive",
      });
    } finally { setLoading(false); }
  };

  const handleShipOrder = async (order: Order) => {
  try {
    setUpdating(true);
    console.log('Sending PATCH to update order:', order.id); // debug log

    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        orderId: order.id,    // Direct field, no nesting
        status: 'completed',  // lowercase, valid status
        action: 'completed'   // value consistent with status
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to update order');
    }

    setOrders(current =>
      current.map(o =>
        o.id === order.id
          ? { ...o, status: 'completed', updatedAt: new Date().toISOString() }
          : o
      )
    );

    toast({
      title: 'Order Completed',
      description: `Order ${order.id.substring(0, 8)}... marked as completed.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order status';
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  } finally {
    setUpdating(false);
  }
};


  const handleDeleteOrder = async (order: Order) => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete order');

      setOrders(current => current.filter(o => o.id !== order.id));
      setOrderToDelete(null);

      toast({
        title: "Order Deleted",
        description: `Order ${order.id.substring(0, 8)}... has been deleted`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete order';
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const sortedOrders = [...orders].sort((a, b) => {
    if (sortConfig.key === 'orderDate') {
      const dateA = new Date(a[sortConfig.key] || a.createdAt || 0).getTime();
      const dateB = new Date(b[sortConfig.key] || b.createdAt || 0).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === 'totalAmount') {
      return sortConfig.direction === 'asc' ? a[sortConfig.key] - b[sortConfig.key] : b[sortConfig.key] - a[sortConfig.key];
    }
    const valueA = String(a[sortConfig.key] || '');
    const valueB = String(b[sortConfig.key] || '');
    return sortConfig.direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
  });

  const handleSort = (key: keyof Order) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getCustomerName = (order: Order) => {
    return order.userDetails?.name ||
           order.shippingInfo?.name ||
           order.userDetails?.email ||
           order.shippingInfo?.email ||
           'Unknown User';
  };

  const getCustomerEmail = (order: Order) => {
    return order.userDetails?.email || order.shippingInfo?.email || 'N/A';
  };

  const getCustomerPhone = (order: Order) => {
    return order.userDetails?.phone || order.shippingInfo?.phone || 'N/A';
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center text-red-500">
          <p className="mb-4">Error: {error}</p>
          <Button onClick={fetchOrders}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orders Management</h1>
        <div className="flex items-center gap-4">
          <Button
            variant={showShipped ? "outline" : "default"}
            onClick={() => setShowShipped(false)}
            disabled={updating}
          >
            Active Orders
          </Button>
          <Button
            variant={showShipped ? "default" : "outline"}
            onClick={() => setShowShipped(true)}
            disabled={updating}
          >
            Shipped Orders
          </Button>
          <Button
            variant="outline"
            onClick={fetchOrders}
            disabled={loading || updating}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <div className="text-sm text-gray-500 ml-4">
            Total: {stats.total} | Completed: {stats.completed} | Pending: {stats.pending}
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('id')}>
                Order ID {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕️'}
              </TableHead>
              <TableHead>Customer Details</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('totalAmount')}>
                Amount {sortConfig.key === 'totalAmount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕️'}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕️'}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('orderDate')}>
                Date {sortConfig.key === 'orderDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕️'}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders
              .filter(order => showShipped ? order.status === 'completed' : order.status !== 'completed')
              .map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {order.id.length > 12 ? `${order.id.substring(0, 8)}...` : order.id}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{getCustomerName(order)}</div>
                      <div className="text-gray-500">{getCustomerPhone(order)}</div>
                      <div className="text-gray-500 text-xs">{getCustomerEmail(order)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, index) => (
                          <div key={index} className="mb-1">
                            {item.quantity}x {item.name}
                            {item.customSize && <span className="text-xs text-gray-500"> ({item.customSize})</span>}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500">No items</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>₹{(order.totalAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'shipped' ? 'bg-green-100 text-green-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(order.orderDate || order.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                        disabled={updating}
                      >
                        View
                      </Button>
                      {order.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleShipOrder(order)}
                            disabled={updating}
                          >
                            {updating ? 'Processing...' : 'Ship'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setOrderToDelete(order)}
                            disabled={updating}
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

        {sortedOrders.filter(order => showShipped ? order.status === 'completed' : order.status !== 'completed').length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No {showShipped ? 'shipped' : 'active'} orders found.</p>
            <Button variant="outline" onClick={fetchOrders} className="mt-2">
              Refresh Orders
            </Button>
          </div>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Order ID: ${selectedOrder.id}`}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <p><strong>Order ID:</strong> {selectedOrder.id}</p>
                  <p><strong>Status:</strong> {selectedOrder.status}</p>
                  <p><strong>Payment Status:</strong> {selectedOrder.paymentStatus}</p>
                  <p><strong>Date:</strong> {formatDate(selectedOrder.orderDate || selectedOrder.createdAt)}</p>
                  <p><strong>Total Amount:</strong> ₹{(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Customer Details</h3>
                  <p><strong>Name:</strong> {getCustomerName(selectedOrder)}</p>
                  <p><strong>Email:</strong> {getCustomerEmail(selectedOrder)}</p>
                  <p><strong>Phone:</strong> {getCustomerPhone(selectedOrder)}</p>
                  <p><strong>Address:</strong> {selectedOrder.shippingInfo?.address || 'N/A'}</p>
                  <p>
                    {selectedOrder.shippingInfo?.city}
                    {selectedOrder.shippingInfo?.state && `, ${selectedOrder.shippingInfo.state}`}
                    {selectedOrder.shippingInfo?.pinCode && ` - ${selectedOrder.shippingInfo.pinCode}`}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
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
                          <TableCell>₹{(item.price || 0).toFixed(2)}</TableCell>
                          <TableCell>₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-semibold">Total Amount:</TableCell>
                        <TableCell className="font-semibold">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500">No items found</p>
                )}
              </div>

              {(selectedOrder.status === 'pending') && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      handleShipOrder(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    disabled={updating}
                  >
                    Mark as Completed
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setOrderToDelete(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    disabled={updating}
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
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
              disabled={updating}
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
