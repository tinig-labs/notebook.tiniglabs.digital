import "server-only";

export type IpaSegment = { start: number; end: number; ipa: string };
export type IpaResult = { model: string; ipa: string; segments: IpaSegment[] };

/**
 * Hands one clip to modal/notebook_phonemes.py. The CPU front door answers in about a second;
 * the GPU job runs in the background and posts its result to /api/ipa-callback. This keeps the
 * Worker well inside Cloudflare's 30 s limit for background work, even on a cold GPU start.
 * Audio goes in the request body (TLS), never by URL, and Modal keeps nothing.
 */
export async function submitJob(jobId: string, wav: Uint8Array) {
  const url = process.env.MODAL_ENDPOINT_URL;
  const token = process.env.MODAL_TOKEN;
  if (!url || !token) throw new Error("MODAL_ENDPOINT_URL / MODAL_TOKEN not set");
  const res = await fetch(`${url.replace(/\/$/, "")}/jobs`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "audio/wav", "x-job-id": jobId },
    body: wav as Uint8Array<ArrayBuffer>,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Modal ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Constant-time check of the bearer token Modal sends with results. */
export async function isModalCaller(authorization: string | null) {
  const token = process.env.MODAL_TOKEN;
  if (!token || !authorization) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(authorization)),
    crypto.subtle.digest("SHA-256", enc.encode(`Bearer ${token}`)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
