import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * API key middleware for /api/v1/* routes.
 *
 * Accepts requests with a non-empty X-API-Key header.
 * The accepted key is configured via the API_KEY environment variable.
 * When API_KEY is not set, any non-empty key is accepted (dev-friendly).
 *
 * Requests missing the header receive a 401 response.
 */
export function proxy(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    console.warn(
      `[proxy] Missing X-API-Key for ${request.method} ${request.nextUrl.pathname}`
    );
    return Response.json(
      { error: "Missing X-API-Key header" },
      { status: 401 }
    );
  }

  const configuredKey = process.env.API_KEY;

  if (configuredKey && apiKey !== configuredKey) {
    console.warn(
      `[proxy] Invalid X-API-Key for ${request.method} ${request.nextUrl.pathname}`
    );
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Key is present (and matches if API_KEY is configured) — allow the request
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
