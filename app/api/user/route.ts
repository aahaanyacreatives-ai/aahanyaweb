import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';          // Firestore (Admin SDK)
import { getAuth } from 'firebase-admin/auth';          // Admin Auth
import bcryptjs from 'bcryptjs';                        // ⛔️ सिर्फ temp है, Auth password संभालता है

const USERS = adminDB.collection('users');
const auth  = getAuth();

/* ───────────── GET : list all users (role=user) ───────────── */
export async function GET() {
  try {
    const snap = await USERS.where('role', '==', 'user').get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(users);
  } catch (err) {
    console.error('GET /api/user error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/* ───────────── POST : create new user ───────────── */
export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role = 'user' } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, password required' }, { status: 400 });
    }

    /* 1️⃣  Firebase Auth user create  */
    const credential = await auth.createUser({ email, password, displayName: name });
    const uid = credential.uid;

    /* 2️⃣  Firestore profile save  */
    await USERS.doc(uid).set({
      email,
      name,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: 'User created', user: { id: uid, email, name, role } },
      { status: 201 },
    );
  } catch (err: any) {
    const code = err.code ?? '';
    if (code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
    console.error('POST /api/user error:', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

/* ───────────── PUT : update user ───────────── */
export async function PUT(req: NextRequest) {
  try {
    const { userId, role, name, email, password } = await req.json();
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    /* 1️⃣  Build update object for Firestore  */
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (role) update.role = role;
    if (name) update.name = name;
    if (email) update.email = email;

    /* 2️⃣  Firestore update (if any field) */
    if (Object.keys(update).length > 1) {
      await USERS.doc(userId).update(update);
    }

    /* 3️⃣  Auth updates (email / password / name) */
    const authUpdate: Record<string, unknown> = {};
    if (name)  authUpdate.displayName = name;
    if (email) authUpdate.email       = email;
    if (password) authUpdate.password = password;
    if (Object.keys(authUpdate).length) {
      await auth.updateUser(userId, authUpdate);
    }

    /* 4️⃣  Return fresh data */
    const snap = await USERS.doc(userId).get();
    if (!snap.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ message: 'User updated', data: { id: snap.id, ...snap.data() } });
  } catch (err) {
    console.error('PUT /api/user error:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/* ───────────── DELETE : remove user ───────────── */
export async function DELETE(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    /* 1️⃣  Delete from Auth */
    await auth.deleteUser(userId);

    /* 2️⃣  Delete Firestore profile */
    await USERS.doc(userId).delete();

    return NextResponse.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /api/user error:', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
