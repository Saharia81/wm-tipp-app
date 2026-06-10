// Runs on the Edge runtime — uses auth.config (no DB imports).
import NextAuth from "next-auth";
import authConfig from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Don't run middleware on Next internals, the auth API routes, or static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
