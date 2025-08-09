// auth.config.ts
import type { AuthOptions, DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import type { IUser } from "@/lib/types/user";
import { User } from "@/models/user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getServerSession } from "next-auth"; // For session fetching in callbacks

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
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  }),

  CredentialsProvider({
    name: "Email / Password",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const ts = new Date().toISOString();
       /*  DEBUG —–––––––––––––––––––––––––––––––––– */
  console.log(`[DEBUG ${ts}] AUTHORIZE input email:`, credentials?.email);
  console.log(`[DEBUG ${ts}] AUTHORIZE input password:`, credentials?.password);
  /*  ––––––––––––––––––––––––––––––––––––––––– */
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] Authorize called with credentials:`, credentials);

      if (!credentials?.email || !credentials?.password) {
        console.log(`[DEBUG ${timestamp}] Missing credentials`);
        return null;
      }

      await connectToDatabase();
      console.log(`[DEBUG ${timestamp}] DB connected`);

      const users = await User.find({}, { email: 1 }).lean();
      console.log(`[DEBUG ${timestamp}] All user emails in DB:`, users.map(u => u.email));
      console.log("[DEBUG] Input password:", credentials.password);  // Logs what you typed on login


    
      const normalizedEmail = credentials.email?.toLowerCase().trim();
      console.log(normalizedEmail);
      const user = await User.findOne({ email: normalizedEmail });
      
      
      console.log(`[DEBUG ${timestamp}] User lookup result:`, user ? 'Found' : 'Not found');

      if (!user) return null;
      console.log("[DEBUG] Stored hash:", user.password);          // Logs DB hash

      const isValid = await compare(credentials.password, user.password);
      if(isValid)console.log("Password Matched")
      console.log(`[DEBUG ${timestamp}] Password valid:`, isValid);

      if (!isValid) return null;

      console.log(`[DEBUG ${timestamp}] Authorize successful`);
      return {
        id: user._id.toString(),
        name: user.name ?? user.email,
        email: user.email,
        role: user.role ?? 'user', // Default role if missing
      };
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
  secret: process.env.AUTH_SECRET || "dev-secret",
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectToDatabase();
        console.log('Debug: Google signIn - DB connected');

        let existing = await User.findOne({ email: user.email! });
        console.log('Debug: Google signIn - Existing user:', existing ? 'Found' : 'Not found');

        if (!existing) {
          const hashedPassword = await hash(Math.random().toString(36).slice(-8), 10);
          existing = new User({
            email: user.email!,
            name: user.name || user.email!,
            password: hashedPassword,
            role: "user"
          });
          await existing.save();
          console.log('Debug: Google signIn - New user created');
        }

        if (existing) {
          user.id = existing._id.toString();
          user.role = existing.role;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] JWT callback - Incoming user:`, JSON.stringify(user));
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "user";
        console.log(`[DEBUG ${timestamp}] JWT updated - Role: ${token.role}`);
      }
      return token;
    },
    async session({ session, token }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] Session callback - Incoming token:`, JSON.stringify(token));
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        console.log(`[DEBUG ${timestamp}] Session updated - Role: ${session.user.role}`);
      }
      return session;
    },
    async redirect(params: { url: string, baseUrl: string, token?: any }) {
  const { url, baseUrl, token } = params;
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG ${timestamp}] Redirect callback called - URL: ${url}, Base: ${baseUrl}`);

      // Prevent infinite loop: If URL is already the base or a loop is detected, return it
      if (url === baseUrl || url === `${baseUrl}/`) {
        console.log(`[DEBUG ${timestamp}] Loop detected - Returning base URL to break cycle`);
        return baseUrl;
      }

      // Get session to check role
      const role = token?.role ?? 'user';
      console.log(`[DEBUG ${timestamp}] Redirect role check: ${role}`);

      // If coming from login and admin, redirect to dashboard
      if (url.includes('/login') && role === 'admin') {
        console.log(`[DEBUG ${timestamp}] Admin detected from login - Redirecting to /admin/dashboard`);
        return `${baseUrl}/admin/dashboard`;
      }

      // Default: If the URL starts with base, return it; else, home
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  session: {
    strategy: "jwt",
  },
};

/* ---------- Exports ---------- */
export { authConfig }; // named export
export default authConfig; // default export (same object)
