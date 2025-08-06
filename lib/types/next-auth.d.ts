// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;  // Explicitly define id as string
      role: 'admin' | 'user';  // Match your User model enum
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'admin' | 'user';
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'admin' | 'user';
  }
}
