import NextAuth from "next-auth";
import { DefaultSession } from "next-auth"; // ✅ Add this import
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db } from "./lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { RequestInternal } from "next-auth";
import { Awaitable } from "next-auth";

// ✅ Add type declarations in this file to avoid conflicts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "user";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "user";
  }
}

// ✅ Helper function for type safety
function isValidRole(role: any): role is "admin" | "user" {
  return role === "admin" || role === "user";
}

// Define User type
interface User {
  id: string;
  email: string;
  name?: string;
  role?: "admin" | "user"; // ✅ Fixed: Use union type instead of string
}

// Build providers array dynamically
const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

// Credentials provider
providers.push(
  CredentialsProvider({
    name: "Email / Password",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials: Record<"email" | "password", string> | undefined, req: Pick<RequestInternal, "body" | "query" | "headers" | "method">) {
      if (!credentials?.email || !credentials?.password) return null;

      // Look up user by email in Firestore
      const userDocRef = doc(db, "users", credentials.email.toLowerCase().trim());
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) return null;

      const userData = userSnap.data();

      // Compare password
      const isValid = await compare(credentials.password, userData.password);
      if (!isValid) return null;

      // ✅ Ensure proper role typing
      const userRole = isValidRole(userData.role) ? userData.role : "user";

      return {
        id: userSnap.id,
        name: userData.name ?? userData.email,
        email: userData.email,
        role: userRole, // ✅ Now properly typed
      };
    },
  })
);

export const auth = NextAuth({
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "dev-secret", // fallback in dev
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) {
          console.error("Google user has no email, rejecting sign-in.");
          return false;
        }

        const email = user.email.toLowerCase().trim();
        const userDocRef = doc(db, "users", email);
        const existingSnap = await getDoc(userDocRef);

        if (!existingSnap.exists()) {
          // Register new Google user
          const hashedPassword = await hash(Math.random().toString(36).slice(-8), 10);
          await setDoc(userDocRef, {
            email,
            name: user.name ?? email,
            password: hashedPassword, // temp (don't use in prod)
            role: "user",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // Attach ID + role
        const updatedData = (await getDoc(userDocRef)).data();
        if (updatedData) {
          user.id = userDocRef.id;
          // ✅ Ensure proper role typing with validation
          user.role = isValidRole(updatedData.role) ? updatedData.role : "user";
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Persist id + role into token
      if (user) {
        token.id = (user as User).id;
        // ✅ Ensure role is properly typed
        token.role = isValidRole((user as User).role) ? (user as User).role! : "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        // ✅ FIXED: Direct assignment instead of string casting
        session.user.role = token.role; // This was the line causing the original error
      }
      return session;
    },
  },
});
