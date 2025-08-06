import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { User } from '@/models/user';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Check if admin exists
    let admin = await User.findOne({ email: 'admin@example.com' });
    
    if (!admin) {
      // Create admin user if it doesn't exist
      const hashedPassword = await bcrypt.hash('secure123', 10);
      admin = new User({
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        name: 'Admin User'
      });
      await admin.save();
      return NextResponse.json({ message: 'Admin user created successfully' });
    }
    
    // Ensure existing user has admin role
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
      return NextResponse.json({ message: 'User updated to admin role' });
    }
    
    return NextResponse.json({ message: 'Admin user already exists' });
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup admin user' },
      { status: 500 }
    );
  }
}
