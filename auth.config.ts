import type { AuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { FirestoreAdapter } from "@next-auth/firebase-adapter";
import { cert } from "firebase-admin/app"; // For adapter cert
import { adminDB } from "@/lib/firebaseAdmin"; // Server-side admin DB for queries
import { db } from "@/lib/firebase"; // Client DB for operations
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase-admin/auth"; // For server-side auth verification

/* ---------- Auth Config ---------- */
const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
        }
      }
    }),
    CredentialsProvider({
      name: "Email / Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          // Use Firebase Admin to verify credentials (secure; no stored passwords in Firestore)
          const auth = getAuth();
          // Note: In full setup, client should signInWithEmailAndPassword and pass token; this is server-side placeholder
          const usersCollection = adminDB.collection('users');
          const userSnap = await usersCollection.where('email', '==', credentials.email.toLowerCase().trim()).get();
          if (userSnap.empty) return null;

          const userDoc = userSnap.docs[0].data();
          const hashedPassword = userDoc.hashedPassword;
          
          // Import bcryptjs for password comparison
          const bcrypt = require('bcryptjs');
          const isValidPassword = await bcrypt.compare(credentials.password, hashedPassword);
          
          if (!isValidPassword) {
            console.log('[DEBUG] Password validation failed');
            return null;
          }

          console.log('[DEBUG] Password validation successful, returning user with role:', userDoc.role);
          return {
            id: userSnap.docs[0].id,
            name: userDoc.name ?? userDoc.email,
            email: userDoc.email,
            role: (userDoc.role as 'admin' | 'user') ?? 'user',
          };
        } catch (error) {
          console.error("Error in authorize:", error);
          return null;
        }
      }
    })
  ],
  
  // Adapter with cert for Firebase Admin credentials
  adapter: FirestoreAdapter({
    credential: cert({
      projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
      clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  }) as Adapter, // Type assertion for compatibility
  
  pages: {
    signIn: "/login",
    error: "/login",
  },
  
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  
  debug: process.env.NODE_ENV === 'development',
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          if (!user.email) {
            console.error('No email provided by Google');
            return false;
          }

          const userDocRef = doc(db, 'users', user.email);
          const existingSnap = await getDoc(userDocRef);

          if (!existingSnap.exists()) {
            console.log('Creating new user document for:', user.email);
            await setDoc(userDocRef, {
              email: user.email,
              name: user.name || user.email,
              role: "user", // Default role
              provider: "google",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            // Update last sign in
            await setDoc(userDocRef, {
              lastSignIn: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          const userData = existingSnap.data() || (await getDoc(userDocRef)).data();
          user.id = userDocRef.id;
          user.role = userData?.role || "user";
          
          console.log('Google sign in successful for:', user.email, 'Role:', user.role);
          return true;
        } catch (error) {
          console.error('Google sign in error:', error);
          return false;
        }
      }
      
      return true;
    },

    async jwt({ token, user }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] JWT callback started - incoming user:`, JSON.stringify(user || 'no user'));
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "user";
        token.email = user.email;
        console.log(`[DEBUG ${timestamp}] JWT updated - role set to: ${token.role} - full token:`, JSON.stringify(token));
      } else if (token?.email) {
        // If we have an email but no user (subsequent requests), verify role from DB
        try {
          const userSnap = await adminDB.collection('users').where('email', '==', token.email).get();
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            token.role = userData.role ?? "user";
            console.log(`[DEBUG ${timestamp}] JWT role refreshed from DB:`, token.role);
          }
        } catch (error) {
          console.error(`[DEBUG ${timestamp}] Error refreshing role from DB:`, error);
        }
      }
      return token;
    },

    async session({ session, token }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] Session callback started - incoming token:`, JSON.stringify(token));
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role || 'user' as const; // Use the correct type
        console.log(`[DEBUG ${timestamp}] Session updated - role set to: ${session.user.role} - full session:`, JSON.stringify(session));
      } else {
        console.log(`[DEBUG ${timestamp}] Session callback - no token, empty session:`, JSON.stringify(session));
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log('[DEBUG] Redirect callback - URL:', url, 'BaseURL:', baseUrl);
      
      // Handle admin redirects
      if (url.includes('/admin/dashboard')) {
        console.log('[DEBUG] Admin dashboard redirect detected');
        return `${baseUrl}/admin/dashboard`;
      }
      
      // Default redirect handling
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  
  useSecureCookies: process.env.NODE_ENV === 'production',
};

export default authConfig;
