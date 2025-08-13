"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"

export default function MyOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user?.id) {
      router.push("/login")
      return
    }

    const fetchOrders = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/orders', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch orders')
        }

        const ordersData = await response.json()
        setOrders(ordersData || [])
      } catch (err: any) {
        console.error('Error fetching orders:', err)
        toast({
          title: "Error loading orders",
          description: err.message || "Could not fetch your orders. Please try again.",
          variant: "destructive",
        })
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [session, status, router])

  if (loading || status === "loading") {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // User not logged in: fallback (shouldn't show, router will push)
  if (!session?.user?.id) return null

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-500">You haven't placed any orders yet.</p>
          <Link href="/" passHref>
            <Button>Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Order ID: {order.id}</span>
                  <span
                    className={`text-sm font-medium ${
                      order.status === "completed" ? "text-green-600" : "text-orange-500"
                    }`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Order Date: {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "-"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px] hidden sm:table-cell">Image</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="hidden sm:table-cell">
                            <Image
                              src={item.image || "/placeholder.svg?height=64&width=64&query=order%20item"}
                              width={64}
                              height={64}
                              alt={item.name}
                              className="aspect-square rounded-md object-cover"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.name}
                            {item.customSize && (
                              <p className="text-xs text-muted-foreground">Size: {item.customSize}</p>
                            )}
                            {item.customImage && <p className="text-xs text-muted-foreground">Custom Image Added</p>}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-4 text-lg font-bold">
                  Total: ₹{order.totalAmount.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
