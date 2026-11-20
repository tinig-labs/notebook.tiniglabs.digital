import "server-only";

/**
 * Sends email through the Azure Communication Services REST API (the same resource that sends the
 * Neon Auth emails over SMTP). Workers can't open SMTP easily, so this signs the request with the
 * resource's access key (HMAC-SHA256), as documented for ACS.
 *
 *   ACS_ENDPOINT     https://<resource>.<region>.communication.azure.com   (var)
 *   ACS_ACCESS_KEY   the resource's primary key                           (secret)
 *   ALERT_FROM       a verified sender, e.g. no-reply@tiniglabs.digital    (var)
 */
const API_VERSION = "2023-03-31";

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const emailConfigured = () => !!(process.env.ACS_ENDPOINT && process.env.ACS_ACCESS_KEY && process.env.ALERT_FROM);

export async function sendEmail(msg: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: { address: string; displayName?: string };
}) {
  const endpoint = process.env.ACS_ENDPOINT;
  const key = process.env.ACS_ACCESS_KEY;
  const from = process.env.ALERT_FROM;
  if (!endpoint || !key || !from) throw new Error("Email is not configured (ACS_ENDPOINT, ACS_ACCESS_KEY, ALERT_FROM)");

  const url = new URL(`/emails:send?api-version=${API_VERSION}`, endpoint);
  const body = JSON.stringify({
    senderAddress: from,
    recipients: { to: [{ address: msg.to }] },
    content: { subject: msg.subject, plainText: msg.text, ...(msg.html ? { html: msg.html } : {}) },
    ...(msg.replyTo ? { replyTo: [msg.replyTo] } : {}),
  });

  const date = new Date().toUTCString();
  const contentHash = b64(await crypto.subtle.digest("SHA-256", enc.encode(body)));
  const toSign = `POST\n${url.pathname}${url.search}\n${date};${url.host};${contentHash}`;
  const hmacKey = await crypto.subtle.importKey("raw", unb64(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = b64(await crypto.subtle.sign("HMAC", hmacKey, enc.encode(toSign)));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ms-date": date,
      "x-ms-content-sha256": contentHash,
      authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status !== 202) throw new Error(`ACS email responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.headers.get("operation-location");
}
