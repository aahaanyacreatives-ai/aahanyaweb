import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { User } from '@/models/user';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import bcryptjs from 'bcryptjs';

// Get user profile
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const user = await User.findById(token.sub).select('-password');
      
      if (!user) {
        return errorResponse('User not found', 404);
      }
      
      return successResponse(user);
    } catch (error) {
      console.error('User GET error:', error);
      return errorResponse('Failed to fetch user profile');
    }
  });
}

// Update user profile
export async function PUT(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const { password, ...data } = await req.json();
      
      const updateData: any = { ...data, updatedAt: new Date() };
      
      // If password is being updated, hash it
      if (password) {
        const salt = await bcryptjs.genSalt(10);
        updateData.password = await bcryptjs.hash(password, salt);
      }
      
      const user = await User.findByIdAndUpdate(
        token.sub,
        updateData,
        { new: true }
      ).select('-password');
      
      if (!user) {
        return errorResponse('User not found', 404);
      }
      
      return successResponse(user, 'Profile updated successfully');
    } catch (error) {
      console.error('User update error:', error);
      return errorResponse('Failed to update profile');
    }
  });
}
