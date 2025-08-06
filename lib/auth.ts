// lib/auth.ts
import { getServerSession } from "next-auth";
import authConfig from "@/auth.config";
import type { User } from "@/lib/types"; // Assume this type includes 'role' (e.g., { id: string, email: string, role: string, ... })

/**
 * Server-side helper to get the current logged-in user.
 * Falls back to `undefined` if no session exists.
 */
export async function getCurrentUser() {
  const timestamp = new Date().toISOString(); // For consistent debug logging (matches history style)
  try {
    console.log(`[DEBUG ${timestamp}] getCurrentUser called - fetching session`);

    const session = await getServerSession(authConfig);

    if (!session || !session.user) {
      console.log(`[DEBUG ${timestamp}] No session or user found`);
      return undefined;
    }

    // Log key user details for debugging (e.g., to confirm role is in session)
    console.log(`[DEBUG ${timestamp}] Session user fetched: email=${session.user.email || 'unknown'}, role=${session.user.role || 'undefined'}`);

    return session.user as User | undefined;
  } catch (error) {
    console.error(`[DEBUG ${timestamp}] Error in getCurrentUser:`, JSON.stringify(error));
    return undefined;
  }
}
