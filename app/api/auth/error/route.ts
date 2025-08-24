// app/api/auth/error/route.ts - NO MAJOR CHANGES (GENERAL ERROR HANDLER)
import { NextResponse } from "next/server";

/**
 * Overrides the default NextAuth error endpoint.
 * – Browser visits are redirected to /login.
 * – Programmatic (e.g. fetch) requests receive a JSON error object.
 */
export async function GET(request: Request) {
  // If the request’s “Accept” header prefers HTML, do a 302 redirect.
  const acceptsHTML = request.headers.get("accept")?.includes("text/html");
  if (acceptsHTML) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Otherwise respond with JSON so callers don’t throw.
  return NextResponse.json(
    {
      error: "Authentication error",
      message: "You were redirected to the login page because your session is invalid or has expired.",
    },
    { status: 401 },
  );
}

/* POST is rarely used for this endpoint, but we mirror GET for completeness. */
export const POST = GET;
