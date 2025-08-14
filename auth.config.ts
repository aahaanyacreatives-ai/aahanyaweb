// auth.config.ts - FIXED VERSION
import type { AuthOptions, DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import type { IUser } from "@/lib/types/user";
import { User } from "@/models/user";
import { connectToDatabase } from "@/lib/db/mongodb";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string;
  }
}

/* ---------- Providers ---------- */
const providers = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // Add authorization URL with proper scopes
    authorization: {
      params: {
        prompt: "consent",
        access_type: "offline",
        response_type: "code"
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
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] AUTHORIZE called with email:`, credentials?.email);

      if (!credentials?.email || !credentials?.password) {
        console.log(`[DEBUG ${timestamp}] Missing credentials`);
        return null;
      }

      try {
        await connectToDatabase();
        console.log(`[DEBUG ${timestamp}] DB connected successfully`);

        const normalizedEmail = credentials.email?.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        
        console.log(`[DEBUG ${timestamp}] User lookup result:`, user ? 'Found' : 'Not found');

        if (!user) {
          console.log(`[DEBUG ${timestamp}] User not found for email: ${normalizedEmail}`);
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        console.log(`[DEBUG ${timestamp}] Password validation:`, isValid ? 'Valid' : 'Invalid');

        if (!isValid) {
          console.log(`[DEBUG ${timestamp}] Invalid password`);
          return null;
        }

        console.log(`[DEBUG ${timestamp}] Authentication successful`);
        return {
          id: user._id.toString(),
          name: user.name ?? user.email,
          email: user.email,
          role: user.role ?? 'user',
        };
      } catch (error) {
        console.error(`[DEBUG ${timestamp}] Error in authorize:`, error);
        return null;
      }
    },
  }),
];

/* ---------- Config object ---------- */
const authConfig: AuthOptions = {
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  // Add debug mode
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async signIn({ user, account, profile }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] SignIn callback - Provider: ${account?.provider}`);
      console.log(`[DEBUG ${timestamp}] SignIn callback - User:`, JSON.stringify(user, null, 2));
      console.log(`[DEBUG ${timestamp}] SignIn callback - Account:`, JSON.stringify(account, null, 2));

      if (account?.provider === "google") {
        try {
          await connectToDatabase();
          console.log(`[DEBUG ${timestamp}] Google signIn - DB connected`);

          if (!user.email) {
            console.error(`[DEBUG ${timestamp}] Google signIn - No email provided`);
            return false;
          }

          let existing = await User.findOne({ email: user.email });
          console.log(`[DEBUG ${timestamp}] Google signIn - Existing user:`, existing ? 'Found' : 'Not found');

          if (!existing) {
            console.log(`[DEBUG ${timestamp}] Creating new user for Google account`);
            const hashedPassword = await hash(Math.random().toString(36).slice(-8), 10);
            existing = new User({
              email: user.email,
              name: user.name || user.email,
              password: hashedPassword,
              role: "user"
            });
            await existing.save();
            console.log(`[DEBUG ${timestamp}] New Google user created successfully`);
          }

          // Update user object with database info
          user.id = existing._id.toString();
          user.role = existing.role || "user";
          
          console.log(`[DEBUG ${timestamp}] Google signIn successful - User ID: ${user.id}, Role: ${user.role}`);
          return true;
        } catch (error) {
          console.error(`[DEBUG ${timestamp}] Error in Google signIn:`, error);
          return false;
        }
      }
      
      // For credentials provider
      return true;
    },

    async jwt({ token, user, account }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] JWT callback - Account provider:`, account?.provider);
      console.log(`[DEBUG ${timestamp}] JWT callback - Incoming user:`, user ? JSON.stringify(user, null, 2) : 'None');
      
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "user";
        console.log(`[DEBUG ${timestamp}] JWT updated - ID: ${token.id}, Role: ${token.role}`);
      }
      
      console.log(`[DEBUG ${timestamp}] JWT callback - Final token:`, JSON.stringify(token, null, 2));
      return token;
    },

    async session({ session, token }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] Session callback - Incoming token:`, JSON.stringify(token, null, 2));
      
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        console.log(`[DEBUG ${timestamp}] Session updated - ID: ${session.user.id}, Role: ${session.user.role}`);
      }
      
      console.log(`[DEBUG ${timestamp}] Session callback - Final session:`, JSON.stringify(session, null, 2));
      return session;
    },

    async redirect({ url, baseUrl }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] Redirect callback - URL: ${url}, Base: ${baseUrl}`);

      // Prevent infinite loops
      if (url === baseUrl || url === `${baseUrl}/`) {
        console.log(`[DEBUG ${timestamp}] Preventing redirect loop - returning baseUrl`);
        return baseUrl;
      }

      // Handle relative URLs
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`[DEBUG ${timestamp}] Relative URL redirect: ${fullUrl}`);
        return fullUrl;
      }

      // Handle absolute URLs within same domain
      if (url.startsWith(baseUrl)) {
        console.log(`[DEBUG ${timestamp}] Same domain redirect: ${url}`);
        return url;
      }

      // Default to base URL for external redirects
      console.log(`[DEBUG ${timestamp}] External URL detected - redirecting to baseUrl`);
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
  },
  // Add additional options
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
};

/* ---------- Exports ---------- */
export { authConfig };
export default authConfig;