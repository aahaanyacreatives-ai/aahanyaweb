// app/actions/order.ts - SERVER-ONLY
"use server"  // This marks the file as server-side

import { addOrder } from "@/lib/data"  // Safe to import here (server context)
import type { Order } from "@/lib/types"

export async function createOrder(orderData: Omit<Order, "id" | "orderDate">): Promise<Order> {
  // Optional: Add server-side validation or auth checks here
  return addOrder(orderData)
}
