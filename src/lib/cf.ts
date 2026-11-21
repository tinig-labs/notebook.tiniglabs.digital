import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type RateLimiter = { limit: (o: { key: string }) => Promise<{ success: boolean }> };
type Env = {
  AUDIO: R2Bucket;
  REQUEST_LIMITER?: RateLimiter;
  OTP_LIMITER?: RateLimiter;
  UPLOAD_LIMITER?: RateLimiter;
  TRANSCRIBE_LIMITER?: RateLimiter;
};

export const cf = () => getCloudflareContext() as unknown as { env: Env; ctx: ExecutionContext };
export const audioBucket = () => cf().env.AUDIO;

/** Run after the response is sent (Workers waitUntil); falls back to fire-and-forget in dev. */
export function later(p: Promise<unknown>) {
  try {
    cf().ctx.waitUntil(p);
  } catch {
    void p;
  }
}

/** True when allowed. A missing binding (local dev) allows; `strict` refuses instead. */
export async function rateLimit(name: "REQUEST_LIMITER" | "OTP_LIMITER" | "UPLOAD_LIMITER" | "TRANSCRIBE_LIMITER", key: string, strict = false) {
  let limiter: RateLimiter | undefined;
  try {
    limiter = cf().env[name];
  } catch {
    return !strict;
  }
  if (!limiter) return !strict;
  try {
    return (await limiter.limit({ key })).success;
  } catch {
    return !strict;
  }
}

export const clientIp = (r: Request) => r.headers.get("cf-connecting-ip");
