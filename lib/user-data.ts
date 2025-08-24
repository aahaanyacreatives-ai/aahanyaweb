// lib/user-data.ts - SERVER-ONLY FUNCTIONS FOR USERS
// ⚠️ IMPORTANT: This file should ONLY be imported in API routes or server components
// DO NOT import this file in client components

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db } from '@/lib/firebase';  // Your client-side Firebase init
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import bcryptjs from 'bcryptjs';  // Temp for hashing (avoid in production; use Firebase Auth)
import type { User as UserType } from "@/lib/types";

// Add runtime check to prevent client-side usage
if (typeof window !== 'undefined') {
  throw new Error('❌ user-data.ts should not be imported on the client side! Use API routes instead.');
}

// Get user by email (from Firestore)
export async function getUserByEmail(email: string): Promise<UserType | null> {
  try {
    const userDocRef = doc(db, 'users', email.toLowerCase().trim());
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    return {
      id: userSnap.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      createdAt: userData.createdAt?.toDate() ?? new Date(),  // FIXED: Add createdAt (fallback to new Date if missing)
      updatedAt: userData.updatedAt?.toDate() ?? new Date(),  // FIXED: Add updatedAt (fallback to new Date if missing)
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Register a new user (Firebase Auth + Firestore)
export async function registerUser(userData: { email: string; name: string; role: string; password?: string }): Promise<UserType> {
  try {
    const auth = getAuth();

    let userCredential;
    if (userData.password) {
      userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    } else {
      // If no password (e.g., Google signup), assume user is created elsewhere
      throw new Error('Password required for registration');
    }

    const user = userCredential.user;

    // Temp hash (not needed; Auth handles)
    let hashedPassword;
    if (userData.password) {
      const salt = await bcryptjs.genSalt(10);
      hashedPassword = await bcryptjs.hash(userData.password, salt);
    }

    // Save profile in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      email: userData.email,
      name: userData.name,
      role: userData.role as 'user' | 'admin',  // FIXED: Cast to exact role type
      password: hashedPassword,  // Temp; remove in production
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: user.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role as 'user' | 'admin',  // FIXED: Cast to exact role type
      createdAt: new Date(),  // FIXED: Add createdAt (use current date as placeholder)
      updatedAt: new Date(),  // FIXED: Add updatedAt (use current date as placeholder)
    };
  } catch (error) {
    console.error('Register user error:', error);
    throw new Error('Failed to register user');
  }
}

// Login user (for credentials, using Firebase Auth)
export async function loginUser(email: string, password: string): Promise<UserType | null> {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch additional data from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    return {
      id: user.uid,
      email: user.email ?? '',
      name: userData.name,
      role: userData.role,
      createdAt: userData.createdAt?.toDate() ?? new Date(),  // FIXED: Add createdAt (fallback to new Date if missing)
      updatedAt: userData.updatedAt?.toDate() ?? new Date(),  // FIXED: Add updatedAt (fallback to new Date if missing)
    };
  } catch (error) {
    console.error('Login user error:', error);
    return null;
  }
}
