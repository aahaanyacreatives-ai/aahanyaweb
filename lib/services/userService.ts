// services/userService.ts
import { auth, db } from '@/lib/firebase';  // Assume initialized
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from '@/lib/types';

// Signup (creates Auth user + Firestore doc)
export async function signupUser(email: string, password: string, extra: { name?: string; phoneNumber?: string; role?: 'user' | 'admin' }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const userDoc = doc(db, 'users', cred.user.uid);
  await setDoc(userDoc, {
    email,
    ...extra,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return cred.user;
}

// Login
export async function loginUser(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// Get User
export async function getUser(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: uid, ...snap.data() } as User : null;
}

// Update User
export async function updateUser(uid: string, updates: Partial<User>) {
  await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });
}
