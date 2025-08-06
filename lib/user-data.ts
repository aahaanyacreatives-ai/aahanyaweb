// lib/user-data.ts - SERVER-ONLY FUNCTIONS FOR USERS
// ⚠️ IMPORTANT: This file should ONLY be imported in API routes or server components
// DO NOT import this file in client components

import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "@/models/user";  // Assuming your User model
import bcryptjs from 'bcryptjs';
import type { User as UserType } from "@/lib/types";


// Add runtime check to prevent client-side usage
if (typeof window !== 'undefined') {
  throw new Error('❌ user-data.ts should not be imported on the client side! Use API routes instead.');
}

// Get user by email
export async function getUserByEmail(email: string): Promise<UserType | null> {
  await connectToDatabase();
  const user = await User.findOne({ email }).lean() as any;
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    // Add other fields as needed
  };
}

// Register a new user
export async function registerUser(userData: { email: string; name: string; role: string; password?: string }): Promise<UserType> {
  await connectToDatabase();
  
  // Check if user exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password if provided (for credentials signup)
  let hashedPassword;
  if (userData.password) {
    const salt = await bcryptjs.genSalt(10);
    hashedPassword = await bcryptjs.hash(userData.password, salt);
  }

  const created = await User.create({
    email: userData.email,
    name: userData.name,
    role: userData.role,
    password: userData.password,  // Only if provided
  });

  

  return {
    id: created._id.toString(),
    email: created.email,
    name: created.name,
    role: created.role,
  };
}

// Login user (for credentials)
export async function loginUser(email: string, password: string): Promise<UserType | null> {
  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) return null;

  // Compare password
  const isMatch = await bcryptjs.compare(password, user.password);
  if (!isMatch) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
