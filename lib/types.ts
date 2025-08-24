// lib/types.ts - UPDATED WITH PRODUCT PROPERTY IN CARTITEM

// Product Interface
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: "MALE" | "FEMALE" | "METAL_ART" | "FEATURED";
  type?: string;
  inStock: boolean;
  quantity: number;
  createdAt: any;  // Use firebase.firestore.Timestamp or Date
  updatedAt: any;  // Same as above
}

// ✅ UPDATED: Cart Item Interface with product property
export interface CartItem {
  id?: string;     // Add ID for Firestore doc
  userId: string;  // Add this since top-level collection hai
  productId: string;
  quantity: number;
  customSize?: string;
  customImage?: string;
  createdAt: any;
  updatedAt: any;
  product?: Product;  // ✅ ADD THIS LINE - Optional product details
}

// User Interface (Firebase Auth + Firestore doc)
export interface User {
  id: string;      // UID from Firebase Auth
  email: string;
  name?: string;
  role?: "user" | "admin";
  phoneNumber?: string;
  createdAt: any;
  updatedAt: any;
  // Password nahi store karenge, Firebase Auth handle karega
}

// Order Interface
export interface Order {
  id: string;
  userId: string;
  items: {
    productId: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    customSize?: string;
    customImage?: string;
  }[];
  totalAmount: number;
  status: "pending" | "completed" | "cancelled";
  orderDate: any;  // Timestamp
  paymentDetails?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };
  paymentStatus?: "pending" | "success" | "failed";
}

// Coupon Interface
export interface Coupon {
  id?: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
  validFrom: any;  // Timestamp
  validUntil: any;  // Timestamp
  createdAt: any;
}

// Favorite Interface (Favorites collection)
export interface Favorite {
  id?: string;
  userId: string;  // Add this for top-level
  productId: string;
  createdAt: any;
}
