import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { compare } from 'bcryptjs';
import prisma from '@/lib/db/prisma';
import { audit } from '@/lib/security/audit';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: 'ADMIN' | 'THERAPIST' | 'CLIENT' | 'CRISIS_RESPONDER' | 'SUPERVISOR';
    };
  }

  interface User {
    role: 'ADMIN' | 'THERAPIST' | 'CLIENT' | 'CRISIS_RESPONDER' | 'SUPERVISOR';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'ADMIN' | 'THERAPIST' | 'CLIENT' | 'CRISIS_RESPONDER' | 'SUPERVISOR';
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            status: true,
            lockedUntil: true,
            loginAttempts: true
          }
        });

        if (!user || !user.password) {
          await audit.logFailure('LOGIN', 'User', 'Invalid credentials', undefined);
          throw new Error('Invalid credentials');
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await audit.logFailure('LOGIN', 'User', 'Account locked', user.id);
          throw new Error('Account is locked. Please try again later.');
        }

        // Check if account is active
        if (user.status !== 'ACTIVE') {
          await audit.logFailure('LOGIN', 'User', `Account status: ${user.status}`, user.id);
          throw new Error('Account is not active');
        }

        // Verify password
        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          // Increment login attempts
          const attempts = user.loginAttempts + 1;
          const maxAttempts = parseInt(process.env['MAX_LOGIN_ATTEMPTS'] || '5');

          const updateData: Record<string, unknown> = { loginAttempts: attempts };

          // Lock account if max attempts exceeded
          if (attempts >= maxAttempts) {
            const lockoutMinutes = parseInt(process.env['LOCKOUT_DURATION_MINUTES'] || '15');
            updateData['lockedUntil'] = new Date(Date.now() + lockoutMinutes * 60000);
            updateData['loginAttempts'] = 0;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData
          });

          await audit.logFailure(
            'LOGIN',
            'User',
            `Invalid password. Attempts: ${attempts}`,
            user.id
          );

          throw new Error('Invalid credentials');
        }

        // Reset login attempts and update last login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockedUntil: null,
            lastLogin: new Date()
          }
        });

        await audit.logSuccess('LOGIN', 'User', user.id, { method: 'credentials' }, user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    }),

    GoogleProvider({
      clientId: process.env['GOOGLE_CLIENT_ID']!,
      clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: 'CLIENT' as const
        };
      }
    }),

    GitHubProvider({
      clientId: process.env['GITHUB_ID']!,
      clientSecret: process.env['GITHUB_SECRET']!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          role: 'CLIENT' as const
        };
      }
    })
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials') {
        // For OAuth providers, ensure user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        });

        if (!existingUser) {
          // Create user for OAuth sign-in
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || null,
              image: user.image || null,
              role: 'CLIENT',
              emailVerified: new Date()
            }
          });
        }

        await audit.logSuccess(
          'LOGIN',
          'User',
          existingUser?.id || user.id,
          { method: account?.provider },
          existingUser?.id
        );
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      if (trigger === 'update' && session) {
        // Update token with new session data
        token = { ...token, ...session };
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Redirect to appropriate dashboard based on role
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }

      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // Allow URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return baseUrl;
    }
  },

  events: {
    async signOut({ token }) {
      if (token?.id) {
        await audit.logSuccess('LOGOUT', 'User', token.id as string, undefined, token.id as string);
      }
    }
  },

  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
    newUser: '/onboarding'
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24 hours
  },

  jwt: {
    maxAge: 24 * 60 * 60 // 24 hours
  },

  secret: process.env['NEXTAUTH_SECRET']!,

  debug: process.env['NODE_ENV'] === 'development'
};
