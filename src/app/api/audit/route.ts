import { apiUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/cf";

/** Client-side events worth a security record. Exports are built on the device. */
export async function POST(r: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { action, detail } = (await r.json().catch(() => ({}))) as { action?: string; detail?: string };
  if (action !== "export") return Response.json({ error: "unsupported action" }, { status: 400 });
  await audit(user.id, "export", { detail: typeof detail === "string" ? detail.slice(0, 80) : undefined, ip: clientIp(r) });
  return Response.json({ ok: true });
}
