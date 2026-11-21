import "server-only";
import { CONTACT_EMAIL, SITE_URL } from "./constants";

/**
 * Branded emails in the tinig labs design (same layout as collect.tiniglabs.digital), headed by the
 * notebook lockup: the Arch n (public/email-logo.png, from public/brand), "tinig labs", "notebook".
 * Table layout, inline styles and system fonts, because email clients ignore most CSS.
 */
const C = { gatas: "#f9fbfa", tinta: "#13261f", abo: "#5f6f68", pandan: "#1f6b4f", mint: "#e2f3ea" };
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Block = { kind: "p"; text: string } | { kind: "code"; text: string } | { kind: "button"; text: string; href: string };

function layout(subject: string, heading: string, blocks: Block[], preheader: string) {
  const body = blocks
    .map((b) => {
      if (b.kind === "p") return `<p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:${C.abo}">${esc(b.text)}</p>`;
      if (b.kind === "code")
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0"><tr><td align="center" style="background:${C.mint};border-radius:16px;padding:24px 16px"><div style="font-family:${MONO};font-size:34px;line-height:1;font-weight:600;letter-spacing:0.18em;color:${C.pandan}">${esc(b.text)}</div></td></tr></table>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0"><tr><td style="background:${C.pandan};border-radius:9999px"><a href="${esc(b.href)}" style="display:inline-block;padding:16px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">${esc(b.text)}</a></td></tr></table>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.gatas};color:${C.tinta};font-family:${SANS};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.gatas}">
<tr><td align="center" style="padding:40px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
    <tr><td style="padding:0 8px 24px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle"><img src="${SITE_URL}/email-logo.png" width="32" height="32" alt="" style="display:block;border:0"></td>
        <td style="vertical-align:middle;padding-left:10px;font-family:Montserrat,${SANS};font-size:18px;font-weight:600;letter-spacing:-0.02em;color:${C.tinta}">tinig labs</td>
        <td style="vertical-align:middle;padding-left:8px;font-size:14px;font-weight:500;color:${C.abo}">notebook</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:24px;padding:40px 32px;border:1px solid #e3e7e5">
      <h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:500;letter-spacing:-0.03em;color:${C.tinta}">${esc(heading)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:24px 8px 0;font-size:13px;line-height:1.6;color:${C.abo}">
      A recording notebook for speech-language pathologists.<br>
      Questions? <a href="mailto:${CONTACT_EMAIL}" style="color:${C.pandan};text-decoration:none;font-weight:600">${CONTACT_EMAIL}</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "tinig labs notebook",
    "",
    heading,
    "",
    ...blocks.map((b) => (b.kind === "code" ? `    ${b.text}` : b.kind === "button" ? `${b.text}: ${b.href}` : b.text)),
    "",
    `Questions? ${CONTACT_EMAIL}`,
    SITE_URL,
  ].join("\n");

  return { subject, text, html };
}

export function otpEmail(code: string, expiresAt?: string) {
  const ms = expiresAt ? Date.parse(expiresAt) - Date.now() : NaN;
  const mins = Number.isFinite(ms) && ms > 0 ? Math.max(1, Math.round(ms / 60_000)) : null;
  const expiry = mins ? `It expires in ${mins} minute${mins === 1 ? "" : "s"}.` : "It expires soon.";
  return layout(`Your sign-in code: ${code}`, "Sign in", [
    { kind: "p", text: "Enter this code to sign in to your notebook." },
    { kind: "code", text: code },
    { kind: "p", text: `${expiry} Don't share it. We will never ask for it.` },
    { kind: "p", text: "Didn't try to sign in? Ignore this email." },
  ], `${code} is your sign-in code.`);
}

export function requestReceivedEmail(name: string) {
  return layout("We got your request", `Thanks, ${name.split(" ")[0] || "there"}`, [
    { kind: "p", text: "Your request to join the notebook beta is in. We'll email you when your access is ready." },
  ], "Your beta request is in.");
}

export function accessApprovedEmail() {
  return layout("You're in: tinig labs notebook", "You're in", [
    { kind: "p", text: "Your beta access is ready. Sign in with this email; we'll send you a code. No password needed." },
    { kind: "button", text: "Open the notebook", href: `${SITE_URL}/sign-in` },
    { kind: "p", text: "Tip: add it to your home screen to use it offline." },
  ], "Your notebook beta access is ready.");
}

export function newRequestAlert(r: { email: string; name: string; clinic?: string | null; prcLicense?: string | null }) {
  return layout(`Beta request: ${r.name}`, "New beta request", [
    { kind: "p", text: `${r.name} <${r.email}>` },
    { kind: "p", text: `Clinic: ${r.clinic || "—"} · PRC: ${r.prcLicense || "—"}` },
    { kind: "button", text: "Review requests", href: `${SITE_URL}/admin` },
  ], `${r.name} asked for beta access.`);
}
