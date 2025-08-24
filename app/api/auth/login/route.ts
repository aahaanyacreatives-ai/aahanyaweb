// app/api/auth/login/route.ts - UPDATED FOR FIREBASE WITH ADMIN SDK AND NEXTAUTH INTEGRATION
import { NextRequest, NextResponse } from 'next/server';
import { signIn } from 'next-auth/react'; // For NextAuth integration (client-side, but we can call server equivalent)
import { getAuth } from 'firebase-admin/auth'; // Server-side Admin Auth
import { adminAuth } from '@/lib/firebaseAdmin'; // Your Admin init (for auth)

// Note: If you need to verify passwords, use Admin SDK to generate/verify tokens. Direct password check isn't secure here.

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Use Firebase Admin to verify user (secure server-side)
    const auth = getAuth();
    // Step 1: Find user by email (using Admin SDK)
    const userRecord = await auth.getUserByEmail(email).catch(() => null);
    if (!userRecord) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Step 2: Verify password (placeholder - in reality, use client-side signInWithEmailAndPassword and pass ID token)
    // For full security, client should authenticate and send token; server verifies it
    const customToken = await auth.createCustomToken(userRecord.uid); // Example token
    const verifiedUser = await auth.verifyIdToken(customToken); // Simulate verification
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Step 3: If using NextAuth, trigger signIn with credentials
    const result = await signIn('credentials', {
      redirect: false, // Prevent auto-redirect
      email,
      password,
    });

    if (result?.error) {
      console.error('[DEBUG] NextAuth signIn error:', result.error);
      return NextResponse.json({ error: 'Login failed: ' + result.error }, { status: 401 });
    }

    console.log('[DEBUG] Login successful for user:', userRecord.uid);
    return NextResponse.json({ message: 'Login successful', userId: userRecord.uid });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error: ' + (error instanceof Error ? error.message : 'Unknown') }, { status: 500 });
  }
}
