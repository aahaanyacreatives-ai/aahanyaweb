// services/productService.ts
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { Product } from '@/lib/types';

const coll = collection(db, 'products');

// Create
export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(coll, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

// Read All
export async function getAllProducts() {
  const snap = await getDocs(coll);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

// Read One
export async function getProduct(id: string) {
  const snap = await getDoc(doc(db, 'products', id));
  return snap.exists() ? { id, ...snap.data() } as Product : null;
}

// Update
export async function updateProduct(id: string, updates: Partial<Product>) {
  await updateDoc(doc(db, 'products', id), { ...updates, updatedAt: serverTimestamp() });
}

// Delete
export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, 'products', id));
}
