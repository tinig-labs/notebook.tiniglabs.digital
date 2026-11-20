import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

// Lazily created so secrets are read at request time on Workers, not at build time.
let _auth: ReturnType<typeof createNeonAuth> | undefined;
export function auth() {
  return (_auth ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    // Session data is cached in a signed cookie for 10 min, so most requests skip the auth round trip.
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET!, sessionDataTtl: 600 },
  }));
}
