import { NextRequest } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';       // Firestore (Admin SDK)
import { getAuth } from 'firebase-admin/auth';       // Admin Auth
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

const USERS = adminDB.collection('users');
const auth  = getAuth();

/* ───────────── GET : current user profile ───────────── */
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req: NextRequest, token: any) => {
    try {
      const snap = await USERS.doc(token.sub).get();
      if (!snap.exists) return errorResponse('User not found', 404);

      const data = snap.data();
      return successResponse({ id: snap.id, ...data });   // password field never stored here
    } catch (err) {
      console.error('User GET error:', err);
      return errorResponse('Failed to fetch user profile');
    }
  });
}

/* ───────────── PUT : update profile ───────────── */
export async function PUT(req: NextRequest) {
  return withAuth(req, async (_req: NextRequest, token: any) => {
    try {
      const { password, ...data } = await req.json();

      /* 1️⃣  Firestore profile update */
      const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
      if (Object.keys(updateData).length > 1) {           // something other than updatedAt
        await USERS.doc(token.sub).update(updateData);
      }

      /* 2️⃣  Password change (optional) – via Firebase Auth */
      if (password) {
        await auth.updateUser(token.sub, { password });
      }

      /* 3️⃣  Return fresh profile */
      const snap = await USERS.doc(token.sub).get();
      if (!snap.exists) return errorResponse('User not found', 404);

      return successResponse(
        { id: snap.id, ...snap.data() },
        'Profile updated successfully',
      );
    } catch (err) {
      console.error('User update error:', err);
      return errorResponse('Failed to update profile');
    }
  });
}
