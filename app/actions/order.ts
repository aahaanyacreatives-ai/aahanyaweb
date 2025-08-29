// app/actions/order.ts - SERVER-ONLY
"use server"  // This marks the file as server-side

import { addOrder } from "@/lib/data"  // Safe to import here (server context)
import type { Order } from "@/lib/types"

interface ShippingInfo {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  notes?: string;
}

export async function createOrder(orderData: Omit<Order, "id" | "orderDate">, shippingInfo: ShippingInfo): Promise<Order> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...orderData,
      shippingInfo
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || "Failed to create order");
  }

  return response.json();
}
