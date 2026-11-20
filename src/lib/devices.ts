import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const DEVICE_HEADER = "x-device-id";
const validId = (id: string | null): id is string => !!id && /^[A-Za-z0-9_-]{16,64}$/.test(id);

/**
 * Registers or touches the calling device. Returns "revoked" when the user removed it from
 * Settings, so the client wipes its local copy; "missing" when the header is absent or invalid.
 */
export async function checkDevice(userId: string, r: Request): Promise<"ok" | "revoked" | "missing" | "new"> {
  const id = r.headers.get(DEVICE_HEADER);
  if (!validId(id)) return "missing";
  const [d] = await db().select().from(schema.devices).where(and(eq(schema.devices.id, id), eq(schema.devices.userId, userId))).limit(1);
  if (d?.revokedAt) return "revoked";
  if (d) {
    // Coarse touch: once every 10 min is enough for the Settings list.
    if (Date.now() - d.lastSeenAt.getTime() > 600_000) {
      await db().update(schema.devices).set({ lastSeenAt: new Date() }).where(eq(schema.devices.id, id));
    }
    return "ok";
  }
  const name = deviceName(r.headers.get("user-agent") ?? "");
  const [created] = await db().insert(schema.devices).values({ id, userId, name }).onConflictDoNothing().returning();
  // Id taken by someone else's install: refuse rather than share it.
  return created ? "new" : "missing";
}

export const revokedResponse = () => Response.json({ error: "This device was signed out.", code: "DEVICE_REVOKED" }, { status: 410 });
export const missingDeviceResponse = () => Response.json({ error: "Missing device id." }, { status: 400 });

export function deviceName(ua: string) {
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${br} on ${os}`;
}
