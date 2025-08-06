import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { User } from '@/models/user';  // Adjust if default export: import User from '@/models/user';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

// GET: Fetch all users (admin only)
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();

      // Check if user is admin (assuming User model has 'role' field)
      const currentUser = await User.findById(token.sub);
      if (!currentUser || currentUser.role !== 'admin') {
        return errorResponse('Unauthorized: Admin access required', 403);
      }

      const users = await User.find({}).select('-password').sort({ createdAt: -1 });
      return successResponse(users);
    } catch (error) {
      console.error('Users GET error:', error);
      return errorResponse('Failed to fetch users', 500);
    }
  });
}

// PUT: Update user role (admin only)
export async function PUT(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();

      // Check if user is admin
      const currentUser = await User.findById(token.sub);
      if (!currentUser || currentUser.role !== 'admin') {
        return errorResponse('Unauthorized: Admin access required', 403);
      }

      const { userId, role } = await req.json();
      const user = await User.findByIdAndUpdate(
        userId,
        { role, updatedAt: new Date() },
        { new: true }
      ).select('-password');

      if (!user) {
        return errorResponse('User not found', 404);
      }

      return successResponse(user, 'User role updated successfully');
    } catch (error) {
      console.error('User role update error:', error);
      return errorResponse('Failed to update user role', 500);
    }
  });
}

// DELETE: Delete user (admin only)
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();

      // Check if user is admin
      const currentUser = await User.findById(token.sub);
      if (!currentUser || currentUser.role !== 'admin') {
        return errorResponse('Unauthorized: Admin access required', 403);
      }

      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId');
      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return errorResponse('User not found', 404);
      }

      return successResponse(null, 'User deleted successfully');
    } catch (error) {
      console.error('User deletion error:', error);
      return errorResponse('Failed to delete user', 500);
    }
  });
}
