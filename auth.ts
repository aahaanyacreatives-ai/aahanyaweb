import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { loginUser, registerUser, getUserByEmail } from "@/lib/user-data"  // Updated import from previous fix
import type { User } from "@/lib/types"

// Build the providers array safely — Google only if env vars are set.
const providers = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  )
}

/**
 * Fallback provider so the app still works when Google env vars
 * are not configured in the v0 preview.
 * Uses the same in-memory login you already have.
 */
providers.push(
  Credentials({
    name: "Email / Password",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, req) {  // Added 'req' parameter to match type signature
      if (!credentials?.email || !credentials?.password) return null

      // Try to log in with existing credentials
      const user = await loginUser(credentials.email, credentials.password)
      if (user) {
        return {
          id: user.id,
          name: user.name ?? user.email,
          email: user.email,
          role: user.role ?? 'user',  // Added default 'user' to ensure role is always string (fixes undefined issue)
        }
      }
      return null
    },
  }),
)

export const { auth, signIn, signOut } = NextAuth({
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "dev-secret", // dev fallback
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Check if user already exists
        let existingUser = await getUserByEmail(user.email!)
        if (!existingUser) {
          // If not, register them with a default role
          existingUser = await registerUser({
            email: user.email!,
            name: user.name || user.email!,
            role: "user", // Default role for new Google users
          })
        }
        // Attach our internal user ID and role to the NextAuth user object
        if (existingUser) {
          user.id = existingUser.id
          user.role = existingUser.role ?? 'user'  // Ensure role is string here too
        }
      }
      return true
    },
    async jwt({ token, user }) {
      // Persist the user ID and role to the JWT token
      if (user) {
        token.id = user.id
        token.role = (user as User).role // Cast user to our User type to access role
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like user ID and role
      if (token.id) {
        session.user.id = token.id as string
      }
      if (token.role) {
        session.user.role = token.role as string
      }
      return session
    },
  },
})
