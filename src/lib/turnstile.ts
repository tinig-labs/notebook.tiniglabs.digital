import "server-only";

/**
 * Server-side Cloudflare Turnstile check. Without TURNSTILE_SECRET_KEY (local dev, or before the
 * secret is set) it allows the request, so a missing secret never locks people out.
 */
export async function verifyTurnstile(token: unknown, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await res.json()) as { success?: boolean; hostname?: string };
    return data.success === true;
  } catch (e) {
    console.error("turnstile verify failed", e);
    return false;
  }
}
