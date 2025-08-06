'use client';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Button } from "@/components/ui/button"; // Agar koi action button chahiye to use karo

// Define Order type (adjust if needed)
interface Order {
  _id: string;
  userId: string;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: string;
  orderDate: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders'); // Your admin orders API (fetch all)
        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }
        const data = await res.json();
        setOrders(data.data || data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
    // // Auto-refresh chahiye toh yeh uncomment kar sakte ho:
    // const interval = setInterval(fetchOrders, 10000);
    // return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Admin Orders Management</h1>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order._id}>
                <TableCell>{order._id}</TableCell>
                <TableCell>{order.userId}</TableCell>
                <TableCell>₹{order.totalAmount.toFixed(2)}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
