// app/api/auth/[...nextauth]/route.ts - ADD REDIRECT CALLBACK
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
    // ✅ ADD THIS REDIRECT CALLBACK - THIS IS THE FIX!
    async redirect({ url, baseUrl }) {
      console.log('[DEBUG] Redirect callback - URL:', url, 'BaseURL:', baseUrl);
      
      // Force production URL in production environment
      const productionUrl = "https://www.aahaanyacreatives.in";
      
      // If it's a relative URL, prepend the production domain
      if (url.startsWith("/")) {
        const finalUrl = `${productionUrl}${url}`;
        console.log('[DEBUG] Relative URL redirect to:', finalUrl);
        return finalUrl;
      }
      
      // If the URL origin matches production, allow it
      if (new URL(url).origin === productionUrl) {
        console.log('[DEBUG] Production URL redirect allowed:', url);
        return url;
      }
      
      // If localhost in dev, allow it
      if (process.env.NODE_ENV === 'development' && url.includes('localhost')) {
        console.log('[DEBUG] Development localhost redirect allowed:', url);
        return url;
      }
      
      // Default to production URL
      console.log('[DEBUG] Default redirect to production:', productionUrl);
      return productionUrl;
    },

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

export { debugHandler as GET, debugHandler as POST };
