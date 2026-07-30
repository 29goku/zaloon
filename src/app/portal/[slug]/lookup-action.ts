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
