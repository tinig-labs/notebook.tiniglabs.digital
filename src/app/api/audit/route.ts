import { deviceUser } from "@/lib/devices";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/cf";

/** Client-side events worth a security record. Exports are built on the device. */
export async function POST(r: Request) {
  const g = await deviceUser(r);
  if (g.error) return g.error;
  const { action, detail } = (await r.json().catch(() => ({}))) as { action?: string; detail?: string };
  if (action !== "export") return Response.json({ error: "unsupported action" }, { status: 400 });
  await audit(g.user.id, "export", { detail: typeof detail === "string" ? detail.slice(0, 80) : undefined, ip: clientIp(r) });
  return Response.json({ ok: true });
}
