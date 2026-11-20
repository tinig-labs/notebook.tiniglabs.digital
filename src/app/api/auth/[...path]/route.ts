import { auth } from "@/lib/auth/server";
import { isAllowed, normEmail } from "@/lib/allowlist";
import { clientIp, rateLimit } from "@/lib/cf";

const h = () => auth().handler();
type Ctx = { params: Promise<{ path: string[] }> };

// Passwordless only: email OTP. Password and social sign-in/up are closed.
const BLOCKED = new Set(["sign-up/email", "sign-in/email", "sign-in/social", "sign-in/magic-link", "email-otp/passcode"]);
const OTP_PATHS = new Set(["email-otp/send-verification-otp", "sign-in/email-otp"]);

async function post(r: Request, c: Ctx) {
  const path = (await c.params).path.join("/");
  if (BLOCKED.has(path)) return Response.json({ message: "Use the email code to sign in.", code: "METHOD_DISABLED" }, { status: 403 });

  if (OTP_PATHS.has(path)) {
    const body = (await r.clone().json().catch(() => ({}))) as { email?: string };
    const email = normEmail(body.email);
    if (path === "email-otp/send-verification-otp" && !(await rateLimit("OTP_LIMITER", `${clientIp(r) ?? "?"}:${email}`))) {
      return Response.json({ message: "Too many codes requested. Wait a minute and try again.", code: "RATE_LIMITED" }, { status: 429 });
    }
    // Closed beta: no code (and no account) for emails that weren't approved.
    if (!(await isAllowed(email))) {
      return Response.json(
        { message: "This email doesn't have beta access yet. Request access first.", code: "NOT_ALLOWLISTED" },
        { status: 403 },
      );
    }
  }
  return h().POST(r, c);
}

export const GET = (r: Request, c: Ctx) => h().GET(r, c);
export const POST = post;
export const PUT = (r: Request, c: Ctx) => h().PUT(r, c);
export const DELETE = (r: Request, c: Ctx) => h().DELETE(r, c);
export const PATCH = (r: Request, c: Ctx) => h().PATCH(r, c);
