// lib/types.ts (or wherever your Product type is defined)
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: "MALE" | "FEMALE" | "METAL_ART" | "FEATURED";  // ← UPPERCASE to match database
  inStock: boolean;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}



export interface CartItem {
  product: Product
  quantity: number
  customSize?: string // New: for custom size/dimensions
  customImage?: string // New: for custom image (stored as Data URL)
}

// Extend the NextAuth.js User type
export interface User {
  id: string
  email: string
  password?: string // Only for registration, not stored or sent to client
  name?: string
  role?: "user" | "admin" // Add role property
}

// New: Order interface
export interface Order {
  id: string
  userId: string
  items: {
    productId: string // Store product ID
    name: string
    image: string
    price: number
    quantity: number
    customSize?: string
    customImage?: string
  }[]
  totalAmount: number
  status: "pending" | "completed" | "cancelled"
  orderDate: string // ISO string
  paymentDetails?: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }
}

export interface Coupon {
  id?: string;
  _id?: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
  // ADD THESE FIELDS
  validFrom: string | Date;
  validUntil: string | Date;
}

