import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { User } from '@/models/user';
import bcryptjs from 'bcryptjs';

// GET: List all user
export async function GET() {
  await connectToDatabase();
  const users = await User.find({role:'user'}).lean();
  return NextResponse.json(users);
}

// POST: Create a new user
export async function POST(req: NextRequest) {
  await connectToDatabase();
  const { name, email, password, role } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password required" }, { status: 400 });
  }
  // Prevent duplicate email
  const exists = await User.findOne({ email });
  if (exists) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }
  const hashedPassword = await bcryptjs.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword, role: role || "user" });
  return NextResponse.json({ message: "User created", user: { ...user.toObject(), password: undefined } }, { status: 201 });
}

// PUT: Update user role/details (admin panel use-case)
export async function PUT(req: NextRequest) {
  await connectToDatabase();
  const { userId, role, name, email, password } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }
  const update: any = {};
  if (role) update.role = role;
  if (name) update.name = name;
  if (email) update.email = email;
  if (password) update.password = await bcryptjs.hash(password, 10);

  const user = await User.findByIdAndUpdate(userId, update, { new: true }).select('-password');
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ message: "User updated", data: user });
}

// DELETE: Remove a user (admin panel)
export async function DELETE(req: NextRequest) {
  await connectToDatabase();
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }
  await User.findByIdAndDelete(userId);
  return NextResponse.json({ message: "User deleted" });
}

