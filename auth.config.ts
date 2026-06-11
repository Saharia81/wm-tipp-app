// Edge-safe Auth.js config — no DB imports here.
// middleware.ts runs on the Edge runtime and pulls in this file; auth.ts extends it
// with the Credentials provider (which needs Prisma).
import type { NextAuthConfig } from "next-auth";

const protectedPaths = [
  "/dashboard",
  "/tipps",
  "/admin",
  "/tabelle",
  "/wm-tipp",
  "/profil",
];

export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtected = protectedPaths.some((p) =>
        nextUrl.pathname.startsWith(p),
      );
      if (isOnProtected) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
