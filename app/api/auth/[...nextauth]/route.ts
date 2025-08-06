/**
 * Legacy /api/auth/* endpoints (NextAuth v4) for
 * SessionProvider / signIn / signOut compatibility.
 *
 * We reuse the same configuration that lives in `auth.config.ts`
 * so there is a single source of truth.
 */
import NextAuth from "next-auth";
import authConfig from "@/auth.config"; // Ensure this path is correct (e.g., adjust if it's in lib/)

// Separate imports: type-only for NextRequest, regular for NextResponse (used as value)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// DEBUG: Log when this route file is loaded
console.log("[DEBUG] NextAuth route.ts loaded at:", new Date().toISOString());

// DEBUG: Log config keys and import path
console.log("[DEBUG] Imported authConfig from path: '@/auth.config'");
console.log("[DEBUG] Imported authConfig keys:", JSON.stringify(Object.keys(authConfig)));

// Handler with per-request logging and basic error handling
const handler = async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG ${timestamp}] NextAuth handler called - method: ${req.method}, url: ${req.url}`);

  try {
    // Call the NextAuth handler
    // @ts-ignore (if TS complains about types)
    return await NextAuth(authConfig)(req, ...args);
  } catch (error) {
    console.error(`[DEBUG ${timestamp}] Error in NextAuth handler:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

// Export for GET and POST
export { handler as GET, handler as POST };
