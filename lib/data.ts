// lib/data.ts - SERVER-ONLY FIRESTORE HELPERS
// ⚠️ IMPORTANT: Import only in server components/routes

import { adminDB } from '@/lib/firebaseAdmin';  // Your Firebase Admin init
import type { Product } from "@/lib/types";

const PRODUCTS = adminDB.collection('products');

// GET all products
export async function getProducts(): Promise<Product[]> {
  try {
    const snap = await PRODUCTS.get();
    return snap.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description,
      price: doc.data().price,
      images: doc.data().images || [],
      category: doc.data().category,
      type: doc.data().type || null,
      inStock: doc.data().inStock || true,
      quantity: doc.data().quantity || 0,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// NEW: GET product by ID (Fixed for TypeScript 'undefined' errors)
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const docRef = PRODUCTS.doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log(`Product with ID ${id} not found.`);
      return null;  // Return null if not found
    }

    const data = docSnap.data()!;  // Non-null assertion: Safe because exists is true

    return {
      id: docSnap.id,
      name: data.name,
      description: data.description,
      price: data.price,
      images: data.images || [],
      category: data.category,
      type: data.type || null,
      inStock: data.inStock || true,
      quantity: data.quantity || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
}

// Add more helpers if needed (e.g., addProduct, updateProduct, etc.)
