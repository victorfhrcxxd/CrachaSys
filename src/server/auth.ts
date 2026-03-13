import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { company: { select: { id: true, name: true, slug: true } } },
        });
        if (!user || !user.isActive) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId, companyName: user.company?.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role?: string; companyId?: string; companyName?: string };
        token.role = u.role ?? 'MEMBER';
        token.id = user.id;
        token.companyId = u.companyId ?? undefined;
        token.companyName = u.companyName ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const s = session.user as { role?: string; id?: string; companyId?: string; companyName?: string };
        s.role = token.role as string;
        s.id = token.id as string;
        s.companyId = token.companyId as string;
        s.companyName = token.companyName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
