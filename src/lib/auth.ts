import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

const isDev = process.env.NODE_ENV === "development";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(isDev
      ? [
          Credentials({
            id: "dev-bypass",
            name: "Dev Bypass",
            credentials: { email: { label: "Email", type: "text" } },
            async authorize(credentials) {
              const email = credentials?.email as string | undefined;
              if (!email) return null;
              const user = await prisma.user.findFirst({
                where: { email },
                select: { id: true, salonId: true, role: true, email: true, name: true },
              });
              if (!user) return null;
              return { id: user.id, email: user.email, name: user.name, salonId: user.salonId, role: user.role };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, user }) {
      if (account?.provider === "dev-bypass" && user) {
        token.userId = (user as { id: string }).id;
        token.salonId = (user as { salonId: string }).salonId;
        token.role = (user as { role: string }).role;
        return token;
      }
      if (account) {
        const email = token.email;
        if (email) {
          const dbUser = await prisma.user.findFirst({
            where: { email },
            select: { id: true, salonId: true, role: true },
          });
          if (dbUser) {
            token.userId = dbUser.id;
            token.salonId = dbUser.salonId;
            token.role = dbUser.role;
          }
        }
      }
      return token;
    },
  },
});
