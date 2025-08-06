// lib/auth.config.ts
import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';
import type { Session, User } from 'next-auth';
import { compare } from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/mongodb';
import { User as UserModel } from '@/models/user';

export default {
  providers: [ /* same as before */ ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] JWT callback started - incoming user:`, JSON.stringify(user || 'no user'));
      if (user) {
        token.id = user.id;
        token.role = user.role;
        console.log(`[DEBUG ${timestamp}] JWT updated - role set to: ${token.role} - full token:`, JSON.stringify(token));
      } else {
        console.log(`[DEBUG ${timestamp}] JWT callback - no new user, existing token:`, JSON.stringify(token));
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] Session callback started - incoming token:`, JSON.stringify(token));
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string || 'user'; // Default here too
        console.log(`[DEBUG ${timestamp}] Session updated - role set to: ${session.user.role} - full session:`, JSON.stringify(session));
      } else {
        console.log(`[DEBUG ${timestamp}] Session callback - no token, empty session:`, JSON.stringify(session));
      }
      return session;
    },
  },
  // ... rest of the config same (pages, secret, etc.)
} satisfies AuthOptions;
