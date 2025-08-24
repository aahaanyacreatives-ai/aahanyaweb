// services/favoriteService.ts
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import type { Favorite } from '@/lib/types';

const coll = collection(db, 'favorites');

// Add Favorite
export async function addFavorite(userId: string, productId: string) {
  const ref = await addDoc(coll, {
    userId,
    productId,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

// Get User's Favorites
export async function getUserFavorites(userId: string) {
  const q = query(coll, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Favorite));
}

// Remove
export async function removeFavorite(id: string) {
  await deleteDoc(doc(db, 'favorites', id));
}
