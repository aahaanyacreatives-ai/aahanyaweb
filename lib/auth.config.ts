// lib/auth.config.ts
import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { FirestoreAdapter } from '@next-auth/firebase-adapter';
import { cert } from 'firebase-admin/app';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: 'Email / Password',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const userDocRef = doc(db, 'users', credentials.email.toLowerCase().trim());
          const userSnap = await getDoc(userDocRef);

          if (!userSnap.exists()) return null;

          const userData = userSnap.data();
          const isValid = await compare(credentials.password, userData.password);
          if (!isValid) return null;

          return {
            id: userSnap.id,
            name: userData.name ?? userData.email,
            email: userData.email,
            role: (userData.role as 'admin' | 'user') ?? 'user',
          };
        } catch (error) {
          console.error('Error in authorize:', error);
          return null;
        }
      },
    }),
  ],

  adapter: FirestoreAdapter({
    credential: cert({
      projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
      clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  }),

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as 'admin' | 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'user';
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.AUTH_SECRET || 'dev-secret',
  session: {
    strategy: 'jwt',
  },
};

export default authOptions;
