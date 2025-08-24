// app/api/auth/admin-setup/route.ts - FIXED FOR TYPE ERRORS AND FIREBASE
import { NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';  // Assume you have admin init (from previous)
import { getAuth } from 'firebase-admin/auth';

export async function GET() {
  try {
    const auth = getAuth();
    const usersCollection = adminDB.collection('users');

    // Query admin user
    const adminSnap = await usersCollection.where('email', '==', 'admin@example.com').get();
    let adminDoc = null;
    let admin = null;

    if (!adminSnap.empty) {
      adminDoc = adminSnap.docs[0];
      admin = adminDoc.data();
    }

    if (!admin) {
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: 'admin@example.com',
        password: 'secure123',  // Temp; use strong password or generate
      });

      // Save profile in Firestore (no password needed)
      await usersCollection.doc(userRecord.uid).set({
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({ message: 'Admin user created successfully' });
    }

    // Ensure existing user has admin role
    if (admin.role !== 'admin' && adminDoc) {
      await usersCollection.doc(adminDoc.id).update({ role: 'admin' });
      return NextResponse.json({ message: 'User updated to admin role' });
    }

    return NextResponse.json({ message: 'Admin user already exists' });
  } catch (error: any) {  // Added type for better error handling
    console.error('Admin setup error:', error);
    return NextResponse.json({ error: 'Failed to setup admin user: ' + error.message }, { status: 500 });
  }
}
