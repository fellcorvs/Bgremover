import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/db";

export const authOptions: NextAuthOptions = {
  // Wrap PrismaAdapter in try/catch to fallback to no-adapter mode on DB failure
  adapter: (() => {
    try {
      return PrismaAdapter(prisma);
    } catch (error) {
      console.warn("PrismaAdapter failed, falling back to no-adapter mode:", error);
      return undefined;
    }
  })(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.passwordHash) return null;

          const isValid = await compare(credentials.password, user.passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            credits: user.credits,
          };
        } catch (error) {
          console.warn("Database error during credential auth:", error);
          // Return a mock user for development/demo purposes when DB is unavailable
          // In production, we'd want to return null to force guest mode
          if (process.env.NODE_ENV === "development") {
            return {
              id: "demo-user",
              email: credentials.email,
              name: "Demo User",
              image: "",
              role: "user",
              credits: 999,
            };
          }
          return null;
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: (user as { role?: string }).role || "user",
          credits: (user as { credits?: number }).credits || 0,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          credits: token.credits,
        },
      };
    },
  },
};
