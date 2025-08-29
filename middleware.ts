import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const timestamp = new Date().toISOString();
    
    console.log(`[DEBUG ${timestamp}] Middleware - Path: ${path}, Token:`, JSON.stringify(token));

    // Skip auth check for callback routes
    if (path.startsWith('/api/auth/callback') || path.startsWith('/auth/callback')) {
      console.log(`[DEBUG ${timestamp}] Allowing callback URL:`, path);
      return NextResponse.next();
    }

    // No token means not authenticated
    if (!token) {
      console.log(`[DEBUG ${timestamp}] No token - Redirecting to /login`);
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string ?? "user";
    console.log(`[DEBUG ${timestamp}] User role from token:`, role);

    // Admin routes protection
    if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
      console.log(`[DEBUG ${timestamp}] Admin route check - User role: ${role}`);
      if (role !== "admin") {
        console.log(`[DEBUG ${timestamp}] Non-admin access denied`);
        
        // If it's an API route, return 403 response
        if (path.startsWith('/api/')) {
          console.log(`[DEBUG ${timestamp}] Returning 403 for API route`);
          return new NextResponse(
            JSON.stringify({ error: 'Unauthorized: Admin access required' }),
            { 
              status: 403,
              headers: { 'content-type': 'application/json' }
            }
          );
        }
        
        // For regular routes, redirect to home
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      // Add role to headers for debugging
      const response = NextResponse.next();
      response.headers.set("x-user-role", role);
      return response;
    }

    // Allow access
    console.log(`[DEBUG ${timestamp}] Access granted - Role: ${role}`);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token // Require authentication for matched routes
    }
  }
);

// Protect these routes
export const config = {
  matcher: [
    "/admin/:path*",
    "/my-orders/:path*",
    "/api/admin/:path*"  // Added protection for admin API routes
  ]
};
