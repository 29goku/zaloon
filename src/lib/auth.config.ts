import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/dashboard")) {
        return !!auth;
      }
      return true;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      if (token.salonId) {
        session.user.salonId = token.salonId as string;
      }
      if (token.role) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [],
};
