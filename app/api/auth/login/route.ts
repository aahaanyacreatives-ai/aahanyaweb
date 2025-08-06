// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signIn } from 'next-auth/react';  // Or 'next-auth' for server-side
import { connectToDatabase } from '@/lib/db/mongodb';
import { User } from '@/models/user';
import { compare } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user || !(await compare(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Use NextAuth signIn (server-side)
    const result = await signIn('credentials', { redirect: false, email, password });
    if (!result?.ok) {
      return NextResponse.json({ error: 'Login failed' }, { status: 401 });
    }

    return NextResponse.json({ message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
