import { otpEmail } from "@/lib/emails";
import { isAllowed } from "@/lib/allowlist";
import { emailConfigured, sendEmail } from "@/lib/email";

/**
 * Neon Auth calls this for `send.otp` instead of sending its own email, so sign-in
 * codes go out in the tinig labs design through Azure Communication Services.
 * Blocking: if this fails three times, the user sees an error, so keep it fast.
 */

const enc = new TextEncoder();
const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const utf8b64url = (s: string) => b64url(String.fromCharCode(...enc.encode(s)));

type Jwk = JsonWebKey & { kid?: string };
let jwksCache: { keys: Jwk[]; at: number } | null = null;

async function keyFor(kid: string) {
  const fresh = jwksCache && Date.now() - jwksCache.at < 3_600_000;
  let jwk = fresh ? jwksCache!.keys.find((k) => k.kid === kid) : undefined;
  if (!jwk) {
    const res = await fetch(`${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`JWKS ${res.status}`);
    jwksCache = { keys: ((await res.json()) as { keys: Jwk[] }).keys, at: Date.now() };
    jwk = jwksCache.keys.find((k) => k.kid === kid);
  }
  if (!jwk) return null;
  return crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, false, ["verify"]);
}

async function verified(raw: string, h: Headers) {
  const sig = h.get("x-neon-signature");
  const kid = h.get("x-neon-signature-kid");
  const ts = h.get("x-neon-timestamp");
  if (!sig || !kid || !ts) return false;
  if (Math.abs(Date.now() - Number(ts)) > 5 * 60_000) return false;
  const [header, empty, signature] = sig.split(".");
  if (!header || empty !== "" || !signature) return false;
  const key = await keyFor(kid);
  if (!key) return false;
  const signingInput = `${header}.${utf8b64url(`${ts}.${utf8b64url(raw)}`)}`;
  return crypto.subtle.verify("Ed25519", key, fromB64url(signature), enc.encode(signingInput));
}

type Payload = {
  event_type: string;
  user?: { email?: string };
  event_data?: { otp_code?: string; otp_type?: string; expires_at?: string; delivery_preference?: string };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await verified(raw, req.headers).catch(() => false))) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }
  const p = JSON.parse(raw) as Payload;

  if (p.event_type === "send.otp") {
    const to = p.user?.email;
    const code = p.event_data?.otp_code;
    if (!to || !code) return Response.json({ error: "missing email or code" }, { status: 400 });
    if (!emailConfigured()) return Response.json({ error: "email not configured" }, { status: 503 });
    // Defence in depth: the auth proxy already refuses unapproved emails.
    if (!(await isAllowed(to))) return Response.json({ ok: true, skipped: true });
    const mail = otpEmail(code, p.event_data?.expires_at);
    // 5xx lets Neon retry; ACS accepts within a second or two.
    await sendEmail({ to, ...mail });
  }
  return Response.json({ ok: true });
}
