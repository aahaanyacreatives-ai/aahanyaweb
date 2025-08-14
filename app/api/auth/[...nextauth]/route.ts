// app/api/auth/[...nextauth]/route.ts - FIXED VERSION
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// DEBUG: Log when this route file is loaded
console.log("[DEBUG] NextAuth route.ts loaded at:", new Date().toISOString());
console.log("[DEBUG] Environment variables check:");
console.log("- GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✓ Present" : "✗ Missing");
console.log("- GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✓ Present" : "✗ Missing");
console.log("- NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✓ Present" : "✗ Missing");
console.log("- NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "Not set (will use default)");

// Create the NextAuth handler
const handler = NextAuth(authConfig);

// Add debug logging wrapper
const debugHandler = async (req: Request, context: any) => {
  const timestamp = new Date().toISOString();
  const url = new URL(req.url);
  const method = req.method;
  
  console.log(`[DEBUG ${timestamp}] NextAuth request - Method: ${method}, Path: ${url.pathname}, Search: ${url.search}`);
  
  try {
    const response = await handler(req, context);
    console.log(`[DEBUG ${timestamp}] NextAuth response - Status: ${response.status}`);
    return response;
  } catch (error) {
    console.error(`[DEBUG ${timestamp}] NextAuth handler error:`, error);
    throw error;
  }
};

// Export the handler for both GET and POST
export { debugHandler as GET, debugHandler as POST };