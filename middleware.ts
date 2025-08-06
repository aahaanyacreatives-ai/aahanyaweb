// C:\Users\Asus\OneDrive\Desktop\aahaanya-creatives\middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role || 'user';
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG ${timestamp}] Middleware called - Path: ${req.nextUrl.pathname}, Role: ${role}, Token exists: ${!!token}`);

    // If no token at all, redirect to login (only for protected routes)
    if (!token) {
      console.log(`[DEBUG ${timestamp}] No token - Redirecting to /login`);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check for admin routes
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (role !== 'admin') {
        console.log(`[DEBUG ${timestamp}] Non-admin access denied - Redirecting to /`);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  }
  // Remove the callbacks object entirely
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/my-orders/:path*',
  ]
};
