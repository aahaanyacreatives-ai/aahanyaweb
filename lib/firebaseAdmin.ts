// lib/firebaseAdmin.ts - SERVER-SIDE FIREBASE ADMIN INIT (FIXED WITH DEBUGGING)
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';  // If you need Auth

// Service account from env (no hardcode)
const rawPrivateKey = process.env.AUTH_FIREBASE_PRIVATE_KEY || '';
// Remove quotes if present and handle newlines
const privateKey = rawPrivateKey
  .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
  .replace(/\\\\n/g, '\n')      // Handle double-escaped
  .replace(/\\n/g, '\n')        // Handle single-escaped
  .trim();                      // Remove extra whitespace

const serviceAccount = {
  projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
  clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
  privateKey,
};

// Check env vars
if (!serviceAccount.projectId || !serviceAccount.clientEmail || !privateKey) {
  throw new Error('❌ Missing Firebase Admin env vars (projectId, clientEmail, privateKey) in .env.local');
}

// Debug log (remove after testing) - Shows if headers are present and line breaks
console.log('DEBUG: Private Key Starts With:', privateKey.substring(0, 30));
console.log('DEBUG: Private Key Ends With:', privateKey.substring(privateKey.length - 30));
console.log('DEBUG: Private Key Has Line Breaks:', privateKey.includes('\n'));
console.log('DEBUG: Private Key Length:', privateKey.length);  // Should be ~1700+ chars for a full key

// Strict validation
if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----') || !privateKey.endsWith('-----END PRIVATE KEY-----') || !privateKey.includes('\n')) {
  throw new Error('❌ Invalid Firebase private key format. Must start with "-----BEGIN PRIVATE KEY-----", end with "-----END PRIVATE KEY-----", and have actual line breaks (\n). Paste the FULL key with line breaks in .env.local (no quotes) and regenerate from Firebase if needed.');
}

// Initialize if not already done
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error: unknown) {  // Fixed: Explicitly type error as unknown
    // Narrow the type for safe access
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Firebase Admin init failed:', errorMessage);
    throw error;
  }
} else {
  console.log('📡 Using existing Firebase Admin app');
}

// Export instances and utilities
export const adminDB = getFirestore();
export const adminAuth = getAuth();  // Optional

// Export Firestore utilities
export const serverTimestamp = () => Timestamp.now();
export const fromDate = (date: Date) => Timestamp.fromDate(date);
export { Timestamp };
