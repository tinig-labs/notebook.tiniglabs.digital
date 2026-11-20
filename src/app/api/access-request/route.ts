import { db, schema } from "@/db";
import { normEmail } from "@/lib/allowlist";
import { clientIp, later, rateLimit } from "@/lib/cf";
import { emailConfigured, sendEmail } from "@/lib/email";
import { newRequestAlert, requestReceivedEmail } from "@/lib/emails";
import { verifyTurnstile } from "@/lib/turnstile";

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(r: Request) {
  const ip = clientIp(r);
  if (!(await rateLimit("REQUEST_LIMITER", ip ?? "anon"))) {
    return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }
  const b = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (!(await verifyTurnstile(b.turnstile, ip))) {
    return Response.json({ error: "Please complete the bot check and try again." }, { status: 403 });
  }
  const email = normEmail(b.email);
  const name = clip(b.name, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({ error: "Enter a valid email." }, { status: 400 });
  if (!name) return Response.json({ error: "Enter your name." }, { status: 400 });
  if (b.consent !== true) return Response.json({ error: "Please agree to the privacy notice." }, { status: 400 });

  const row = { email, name, clinic: clip(b.clinic, 160) || null, prcLicense: clip(b.prcLicense, 40) || null };
  const [created] = await db().insert(schema.accessRequests).values(row).onConflictDoNothing().returning();

  // Same response either way, so the form doesn't reveal who already asked.
  if (created && emailConfigured()) {
    later(
      Promise.allSettled([
        sendEmail({ to: email, ...requestReceivedEmail(name) }),
        process.env.CONTACT_ALERT_TO ? sendEmail({ to: process.env.CONTACT_ALERT_TO, ...newRequestAlert(row) }) : null,
      ]),
    );
  }
  return Response.json({ ok: true });
}
