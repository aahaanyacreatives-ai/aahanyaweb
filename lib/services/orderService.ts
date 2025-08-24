// services/orderService.ts
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import type { Order } from '@/lib/types';

const coll = collection(db, 'orders');

// Create
export async function createOrder(data: Omit<Order, 'id' | 'orderDate'>) {
  const ref = await addDoc(coll, {
    ...data,
    orderDate: serverTimestamp()
  });
  return ref.id;
}

// Get User's Orders
export async function getUserOrders(userId: string) {
  const q = query(coll, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
}

// Update (e.g., status)
export async function updateOrder(id: string, updates: Partial<Order>) {
  await updateDoc(doc(db, 'orders', id), updates);
}
