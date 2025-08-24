// services/authService.ts
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from '@/lib/types';  // Tera types file se import kar

// Signup Function
export async function signup(email: string, password: string, extra: { name?: string; phoneNumber?: string; role?: 'user' | 'admin' } = {}) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    // Firestore mein user profile save kar (password nahi, sirf details)
    await setDoc(doc(db, 'users', uid), {
      email,
      name: extra.name || '',
      phoneNumber: extra.phoneNumber || '',
      role: extra.role || 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Optional: Auth profile update kar (displayName)
    await updateProfile(cred.user, { displayName: extra.name });

    return cred.user;  // User object return kar
  } catch (error) {
    console.error('Signup error:', error);
    throw error;  // Error handle kar apne component mein
  }
}

// Login Function
export async function login(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Logout Function
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

// Get Current User (from Auth state)
export function getCurrentUser() {
  return auth.currentUser;  // Null if not logged in
}

// Get User Profile from Firestore
export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: uid, ...snap.data() } as User : null;
}

// Update User Profile
export async function updateUserProfile(uid: string, updates: Partial<User>) {
  await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });
}
