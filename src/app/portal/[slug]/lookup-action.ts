"use server";

import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findClientByPhone } from "./portal-data";

const COOKIE_NAME = "portal_access";
const TTL_MS = 60 * 60 * 1000; // 1 hour

function sign(clientId: string, expiresAt: number): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  const payload = `${clientId}:${expiresAt}`;
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${hmac}`;
}

export function verifyPortalToken(token: string, clientId: string): boolean {
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [tokenClientId, expiresAtStr, providedHmac] = parts;
  const expiresAt = Number(expiresAtStr);

  if (tokenClientId !== clientId) return false;
  if (Date.now() > expiresAt) return false;

  const expected = sign(clientId, expiresAt);
  const expectedHmac = expected.split(":")[2];
  // Constant-time comparison to prevent timing attacks
  if (providedHmac.length !== expectedHmac.length) return false;
  let diff = 0;
  for (let i = 0; i < providedHmac.length; i++) {
    diff |= providedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
  }
  return diff === 0;
}

export async function portalPhoneLookup(slug: string, phone: string) {
  const client = await findClientByPhone(phone);
  if (!client) {
    // Redirect back to landing with notFound indicator
    redirect(`/portal/${slug}?phone=${encodeURIComponent(phone)}`);
  }

  const expiresAt = Date.now() + TTL_MS;
  const token = sign(client.id, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(TTL_MS / 1000),
    path: `/portal/${slug}/${client.id}`,
  });

  redirect(`/portal/${slug}/${client.id}`);
}
