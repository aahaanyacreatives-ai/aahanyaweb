import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/models/user';
import bcryptjs from 'bcryptjs';


export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { email, password, name } = await req.json();

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
      role: 'user',  // Default role
    });


    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
