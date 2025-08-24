// services/couponService.ts
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, getDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { Coupon } from '@/lib/types';

const coll = collection(db, 'coupons');

// Create
export async function createCoupon(data: Omit<Coupon, 'id' | 'createdAt'>) {
  const ref = await addDoc(coll, {
    ...data,
    createdAt: serverTimestamp(),
    usedCount: data.usedCount || 0
  });
  return ref.id;
}

// Get All
export async function getAllCoupons() {
  const snap = await getDocs(coll);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
}

// Update
export async function updateCoupon(id: string, updates: Partial<Coupon>) {
  await updateDoc(doc(db, 'coupons', id), updates);
}
