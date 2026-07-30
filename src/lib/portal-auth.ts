import { createHmac } from "crypto";

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
  if (providedHmac.length !== expectedHmac.length) return false;
  let diff = 0;
  for (let i = 0; i < providedHmac.length; i++) {
    diff |= providedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
  }
  return diff === 0;
}
