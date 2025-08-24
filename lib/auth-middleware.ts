// lib/auth-middleware.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { errorResponse } from '@/lib/api-response';

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, token: any) => Promise<NextResponse>,
  options: { requireAdmin?: boolean } = {}
) {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[DEBUG ${timestamp}] withAuth called for path: ${req.url}`);

    // ✅ FIXED: Use getToken instead of getServerSession for API routes
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    console.log(`[DEBUG ${timestamp}] Token extracted:`, token ? 'Token found' : 'No token');
    
    if (token) {
      console.log(`[DEBUG ${timestamp}] Token details: id=${token.id}, email=${token.email}, role=${token.role}`);
    }

    if (!token) {
      console.error(`[DEBUG ${timestamp}] No token found`);
      return errorResponse('Unauthorized - Please log in', 401);
    }

    if (!token.sub && !token.id) {
      console.error(`[DEBUG ${timestamp}] Token missing user ID`);
      return errorResponse('Invalid token', 401);
    }

    // Default to 'user' if role is missing in token
    const userRole = token.role || 'user';
    console.log(`[DEBUG ${timestamp}] User details: email=${token.email || 'unknown'}, role=${userRole}`);

    if (options.requireAdmin && userRole !== 'admin') {
      console.error(`[DEBUG ${timestamp}] Admin access denied for user: ${token.email || 'unknown'} (role: ${userRole})`);
      return errorResponse('Forbidden - Admin access required', 403);
    }

    console.log(`[DEBUG ${timestamp}] Auth successful, calling handler`);
    return handler(req, token);
  } catch (error) {
    console.error(`[DEBUG ${timestamp}] Auth middleware error:`, error);
    return errorResponse('Authentication error', 500);
  }
}
