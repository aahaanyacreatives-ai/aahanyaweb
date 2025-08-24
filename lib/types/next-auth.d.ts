// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';
import { AdapterUser } from 'next-auth/adapters';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'user';
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

declare module 'next-auth/adapters' {
  interface AdapterUser {
    role?: 'admin' | 'user';
  }
}
