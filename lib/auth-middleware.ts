// lib/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { errorResponse } from '@/lib/api-response';
import authConfig from '@/auth.config';  // Import your auth config
import type { Session } from 'next-auth'; // For type safety

export async function withAuth(  // Named export (this is key)
  req: NextRequest,
  handler: (req: NextRequest, session: Session) => Promise<NextResponse>,
  options: { requireAdmin?: boolean } = {}
) {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[DEBUG ${timestamp}] withAuth called for path: ${req.url}`);

    const session = await getServerSession(authConfig);
    console.log(`[DEBUG ${timestamp}] Session fetched:`, session ? JSON.stringify(session) : 'No session');

    if (!session || !session.user) {
      console.error(`[DEBUG ${timestamp}] No session or user found`);
      return errorResponse('Unauthorized - Please log in', 401);
    }

    // Default to 'user' if role is missing in session
    const userRole = session.user.role || 'user';
    console.log(`[DEBUG ${timestamp}] User details: email=${session.user.email || 'unknown'}, role=${userRole}`);

    if (options.requireAdmin && userRole !== 'admin') {
      console.error(`[DEBUG ${timestamp}] Admin access denied for user: ${session.user.email || 'unknown'} (role: ${userRole})`);
      return errorResponse('Forbidden - Admin access required', 403);
    }

    console.log(`[DEBUG ${timestamp}] Auth successful, calling handler`);
    return handler(req, session);
  } catch (error) {
    console.error(`[DEBUG ${timestamp}] Auth middleware error:`, JSON.stringify(error));
    return errorResponse('Authentication error', 500);
  }
}
