// app/api/auth/[...nextauth]/route.ts - COMPLETE WORKING VERSION
import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { hash, compare } from "bcryptjs";
import { adminDB } from "@/lib/firebaseAdmin";
import { NextResponse } from 'next/server';

// Helper function for type safety
function isValidRole(role: any): role is "admin" | "user" {
  return role === "admin" || role === "user";
}

// Debug logging
console.log("[DEBUG] NextAuth route loaded at:", new Date().toISOString());
console.log("[DEBUG] Environment check:");
console.log("- NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✓ Present" : "✗ Missing");
console.log("- GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✓ Present" : "✗ Missing");
console.log("- AUTH_FIREBASE_PROJECT_ID:", process.env.AUTH_FIREBASE_PROJECT_ID ? "✓ Present" : "✗ Missing");

const authConfig: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log('[DEBUG] Authorize called with email:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.error('[DEBUG] Missing credentials');
          return null;
        }

        try {
          const usersCollection = adminDB.collection("users");
          
          // Special handling for admin@example.com
          if (credentials.email === 'admin@example.com') {
            console.log('[DEBUG] Admin login attempt detected');
            
            const adminSnap = await usersCollection.where("email", "==", credentials.email).get();
            
            if (adminSnap.empty) {
              // Create admin user if it doesn't exist
              console.log('[DEBUG] Creating admin user');
              const hashedPassword = await hash(credentials.password, 10);
              const newAdminRef = usersCollection.doc();
              await newAdminRef.set({
                email: credentials.email,
                hashedPassword,
                role: 'admin',
                name: 'Admin User',
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              return {
                id: newAdminRef.id,
                email: credentials.email,
                name: 'Admin User',
                role: 'admin'
              };
            }
            
            const adminDoc = adminSnap.docs[0];
            const adminData = adminDoc.data();
            
            if (!adminData.hashedPassword) {
              console.log('[DEBUG] Admin exists but no password, setting password');
              const hashedPassword = await hash(credentials.password, 10);
              await adminDoc.ref.update({
                hashedPassword,
                updatedAt: new Date()
              });
              return {
                id: adminDoc.id,
                email: adminData.email,
                name: adminData.name || 'Admin User',
                role: 'admin'
              };
            }
            
            const isValidPassword = await compare(credentials.password, adminData.hashedPassword);
            console.log('[DEBUG] Admin password verification:', isValidPassword);
            
            if (isValidPassword) {
              return {
                id: adminDoc.id,
                email: adminData.email,
                name: adminData.name || 'Admin User',
                role: 'admin'
              };
            } else {
              console.error('[DEBUG] Admin password verification failed');
              return null;
            }
          }

          // Regular user authentication
          const userSnap = await usersCollection
            .where("email", "==", credentials.email.toLowerCase().trim())
            .get();

          if (userSnap.empty) {
            console.error('[DEBUG] No user found for email:', credentials.email);
            return null;
          }

          const doc = userSnap.docs[0];
          const userData = doc.data();
          
          console.log('[DEBUG] User found:', userData.email, 'Role:', userData.role);

          // Verify password
          const isValid = await compare(credentials.password, userData.hashedPassword || '');
          if (!isValid) {
            console.error('[DEBUG] Invalid password');
            return null;
          }

          const userRole = isValidRole(userData.role) ? userData.role : 'user';
          
          console.log('[DEBUG] Login successful, returning user with role:', userRole);
          
          return { 
            id: doc.id, 
            email: userData.email,
            name: userData.name || userData.email,
            role: userRole
          };
        } catch (error) {
          console.error("[DEBUG] Authorize error:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      console.log('[DEBUG] JWT Callback - User:', JSON.stringify(user), 'Token role before:', token.role);
      
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
        token.email = user.email;
        console.log('[DEBUG] JWT Callback - Token role set to:', token.role);
      }
      return token;
    },
    
    async session({ session, token }) {
      console.log('[DEBUG] Session Callback - Token:', JSON.stringify(token));
      
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "user";
        console.log('[DEBUG] Session Callback - Final session role:', session.user.role);
      }
      return session;
    },

    async signIn({ user, account }) {
      try {
        if (account?.provider === "google") {
          if (!user.email) return false;
          
          const userDoc = await adminDB.collection("users").doc(user.email).get();
          
          if (!userDoc.exists) {
            await adminDB.collection("users").doc(user.email).set({
              email: user.email,
              name: user.name,
              role: "user",
              createdAt: new Date(),
              provider: "google"
            });
            user.role = "user";
          } else {
            const userData = userDoc.data();
            user.role = isValidRole(userData?.role) ? userData.role : "user";
          }
        }
        return true;
      } catch (error) {
        console.error("[DEBUG] SignIn callback error:", error);
        return false;
      }
    }
  },

  pages: {
    signIn: '/login',
  },
  
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authConfig);

// Debug wrapper
const debugHandler = async (req: Request, context: any) => {
  const timestamp = new Date().toISOString();
  const url = new URL(req.url);
  
  console.log(`[DEBUG ${timestamp}] NextAuth request - Method: ${req.method}, Path: ${url.pathname}`);

  try {
    const response = await handler(req, context);
    console.log(`[DEBUG ${timestamp}] NextAuth response - Status: ${response.status}`);
    return response;
  } catch (error) {
    console.error(`[DEBUG ${timestamp}] NextAuth handler error:`, error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// Custom handler wrapper for Coolify
const coolifyHandler = async (req: Request, context: any) => {
  try {
    // Ensure correct URL handling for Coolify's proxy
    const url = new URL(req.url);
    const coolifyUrl = process.env.NEXTAUTH_URL;
    if (coolifyUrl) {
      // Rewrite the request URL to match the Coolify domain
      const newUrl = new URL(url.pathname + url.search, coolifyUrl);
      req = new Request(newUrl, req);
    }

    const timestamp = new Date().toISOString();
    console.log(`[DEBUG ${timestamp}] Auth request:`, {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers),
    });

    const response = await debugHandler(req, context);
    
    // Add CORS headers for Coolify
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL || 'https://www.aahaanyacreatives.in');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    console.error('Coolify handler error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};

export { coolifyHandler as GET, coolifyHandler as POST };
