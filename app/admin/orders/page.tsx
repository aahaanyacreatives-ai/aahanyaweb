'use client';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  status: 'pending' | 'completed' | 'cancelled';
  orderDate: string;
  paymentStatus: 'pending' | 'success' | 'failed';
  shippingInfo: ShippingInfo;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Order;
    direction: 'asc' | 'desc';
  }>({
    key: 'orderDate',
    direction: 'desc'
  });

  // Fetch orders with auto-refresh every 30 seconds
  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }
        const data = await res.json();
        setOrders(data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="text-sm text-gray-500">
          Total Orders: {orders.length} | 
          Completed: {orders.filter(o => o.status === 'completed').length} | 
          Pending: {orders.filter(o => o.status === 'pending').length}
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
            {sortedOrders.map((order) => (
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
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                </TableCell>
                <TableCell>{formatDate(order.orderDate)}</TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View Details
                  </Button>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
