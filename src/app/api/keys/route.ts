import { exportDek, userDek } from "@/lib/crypto/server";
import { deviceUser } from "@/lib/devices";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/cf";

/**
 * Hands the user's data key to one of their own devices over TLS. The browser imports it as a
 * non-extractable CryptoKey, so page scripts can use it but never read it back out.
 */
export async function GET(r: Request) {
  const g = await deviceUser(r);
  if (g.error) return g.error;
  const { user } = g;
  if (g.device === "new") await audit(user.id, "sign_in_device", { ip: clientIp(r) });

  const key = await exportDek(await userDek(user.id));
  return Response.json({ key, user: { id: user.id, email: user.email, name: user.name, admin: user.admin } });
}
