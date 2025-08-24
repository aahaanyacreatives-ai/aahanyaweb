// services/cartService.ts
import { db } from '@/lib/firebase';
import {
  collection, addDoc, getDocs, updateDoc,
  deleteDoc, doc, serverTimestamp, query, where
} from 'firebase/firestore';
import type { CartItem } from '@/lib/types';

const coll = collection(db, 'carts');

/* ------------------------- Add to Cart ------------------------- */
// -- data no longer contains userId, createdAt, updatedAt, or id
export async function addToCart(
  userId: string,
  data: Omit<CartItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) {
  const ref = await addDoc(coll, {
    userId,                          // set once
    ...data,                         // safe: no userId inside
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/* ----------------------- Get User’s Cart ----------------------- */
export async function getUserCart(userId: string) {
  const q = query(coll, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as CartItem)
  );
}

/* ----------------------- Update Quantity ----------------------- */
export async function updateCartItem(
  id: string,
  updates: Partial<CartItem>
) {
  await updateDoc(doc(db, 'carts', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/* --------------------------- Remove --------------------------- */
export async function removeFromCart(id: string) {
  await deleteDoc(doc(db, 'carts', id));
}
