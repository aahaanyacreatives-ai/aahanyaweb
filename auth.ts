import NextAuth from "next-auth";
import { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db } from "./lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { RequestInternal } from "next-auth";

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

function isValidRole(role: any): role is "admin" | "user" {
  return role === "admin" || role === "user";
}

interface User {
  id: string;
  email: string;
  name?: string;
  role?: "admin" | "user";
}

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "Email / Password",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials: Record<"email" | "password", string> | undefined, req: Pick<RequestInternal, "body" | "query" | "headers" | "method">) {
      if (!credentials?.email || !credentials?.password) return null;

      const userDocRef = doc(db, "users", credentials.email.toLowerCase().trim());
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) return null;

      const userData = userSnap.data();
      const isValid = await compare(credentials.password, userData.password);
      if (!isValid) return null;

      const userRole = isValidRole(userData.role) ? userData.role : "user";

      return {
        id: userSnap.id,
        name: userData.name ?? userData.email,
        email: userData.email,
        role: userRole,
      };
    },
  })
);

export const auth = NextAuth({
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "dev-secret",
  callbacks: {
    // ✅ NEW: Add redirect callback to prevent localhost redirects
    async redirect({ url, baseUrl }) {
      const productionUrl = "https://www.aahaanyacreatives.in";
      
      if (url.startsWith("/")) {
        return `${productionUrl}${url}`;
      }
      
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      return productionUrl;
    },
    
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
          const hashedPassword = await hash(Math.random().toString(36).slice(-8), 10);
          await setDoc(userDocRef, {
            email,
            name: user.name ?? email,
            password: hashedPassword,
            role: "user",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const updatedData = (await getDoc(userDocRef)).data();
        if (updatedData) {
          user.id = userDocRef.id;
          user.role = isValidRole(updatedData.role) ? updatedData.role : "user";
        }
      }
      return true;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as User).id;
        token.role = isValidRole((user as User).role) ? (user as User).role! : "user";
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = token.role;
      }
      return session;
    },
  },
});
