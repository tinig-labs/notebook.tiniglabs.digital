import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { apiUser, type CurrentUser } from "@/lib/session";

export const DEVICE_HEADER = "x-device-id";
const validId = (id: string | null): id is string => !!id && /^[A-Za-z0-9_-]{16,64}$/.test(id);

type DeviceCheck = "ok" | "new" | "revoked" | "missing" | "taken";

/**
 * Registers or touches the calling device. Returns "revoked" when the user removed it from
 * Settings (or when this sign-in session belongs to a removed device, so a new device id can't
 * dodge the revocation); "taken" when the id is another account's install, i.e. a different
 * person signed in on this browser; "missing" when the header is absent or invalid.
 */
export async function checkDevice(user: Pick<CurrentUser, "id" | "sessionId">, r: Request): Promise<DeviceCheck> {
  const id = r.headers.get(DEVICE_HEADER);
  if (!validId(id)) return "missing";
  const d = schema.devices;
  const sid = user.sessionId;
  const rows = await db()
    .select()
    .from(d)
    .where(sid ? or(eq(d.id, id), and(eq(d.userId, user.id), eq(d.sessionId, sid))) : eq(d.id, id));

  const own = rows.find((x) => x.id === id);
  if (own && own.userId !== user.id) return "taken";
  if (own?.revokedAt) return "revoked";
  if (sid && rows.some((x) => x.userId === user.id && x.sessionId === sid && x.revokedAt)) return "revoked";

  if (own) {
    // Coarse touch: once every 10 min is enough for the Settings list. Track the session it uses.
    if (Date.now() - own.lastSeenAt.getTime() > 600_000 || (sid && own.sessionId !== sid)) {
      await db()
        .update(d)
        .set({ lastSeenAt: new Date(), ...(sid ? { sessionId: sid } : {}) })
        .where(eq(d.id, id));
    }
    return "ok";
  }
  const name = deviceName(r.headers.get("user-agent") ?? "");
  const [created] = await db().insert(d).values({ id, userId: user.id, name, sessionId: sid ?? null }).onConflictDoNothing().returning();
  // Id taken by someone else's install in the meantime: refuse rather than share it.
  return created ? "new" : "taken";
}

export const revokedResponse = () => Response.json({ error: "This device was signed out.", code: "DEVICE_REVOKED" }, { status: 410 });
export const missingDeviceResponse = () => Response.json({ error: "Missing device id." }, { status: 400 });
export const takenResponse = () =>
  Response.json({ error: "This device is set up for another account.", code: "DEVICE_TAKEN" }, { status: 409 });

/** For route handlers that touch the user's data: a signed-in user on a device that isn't revoked. */
export async function deviceUser(r: Request) {
  const { user, error } = await apiUser();
  if (error) return { error } as const;
  const device = await checkDevice(user, r);
  if (device === "revoked") return { error: revokedResponse() } as const;
  if (device === "missing") return { error: missingDeviceResponse() } as const;
  if (device === "taken") return { error: takenResponse() } as const;
  return { user, device } as const;
}

/** Ends the sign-in session a revoked device was using. Neon Auth keeps sessions in this database. */
export async function endSession(sessionId: string | null) {
  if (!sessionId) return;
  try {
    await db().execute(sql`delete from neon_auth."session" where id = ${sessionId}`);
  } catch (e) {
    console.error("session delete failed (the device is still blocked by its revoked row)", e);
  }
}

export function deviceName(ua: string) {
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${br} on ${os}`;
}
