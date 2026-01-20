import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { workspace: true },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          workspaceId: user.workspaceId,
          workspaceName: user.workspace.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = (user as any).workspaceId;
        token.workspaceName = (user as any).workspaceName;
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user && token.id) {
          // Fetch fresh user data from DB to reflect any updates
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { workspace: true },
          });

          if (freshUser) {
            session.user.name = freshUser.name;
            session.user.email = freshUser.email;
            (session.user as any).id = freshUser.id;
            (session.user as any).workspaceId = freshUser.workspaceId;
            (session.user as any).workspaceName = freshUser.workspace.name;
          }
        }
        return session;
      } catch (error) {
        console.error("❌ Session callback error:", error);
        // Return session even if DB fetch fails to avoid breaking the app
        return session;
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
