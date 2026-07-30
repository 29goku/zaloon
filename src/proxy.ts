import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // API v1 key check
  if (pathname.startsWith("/api/v1/")) {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return Response.json({ error: "Missing X-API-Key header" }, { status: 401 });
    }
    const configuredKey = process.env.API_KEY;
    if (configuredKey && apiKey !== configuredKey) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Auth guard for dashboard
  const isAuthenticated = !!(req as Parameters<typeof auth>[0] & { auth: unknown }).auth;
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|icon-192.png|icon-512.png|manifest.json|sw.js|auth/.*|api/auth/.*|book/.*|portal/.*|intake/.*|kiosk/.*|queue-display/.*|offline).*)",
  ],
};
