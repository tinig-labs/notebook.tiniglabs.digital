import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth/server";
import { isAdminEmail, isAllowed } from "@/lib/allowlist";

export type CurrentUser = { id: string; email: string; name: string; admin: boolean };

/** Session for an approved beta user, memoised per request. Null when signed out or not approved. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection();
  let session;
  try {
    ({ data: session } = await auth().getSession());
  } catch (e) {
    console.error("auth.getSession failed", e);
    return null;
  }
  const u = session?.user;
  if (!u) return null;
  // Access can be revoked after sign-in, so check on every request, not only at sign-in.
  if (!(await isAllowed(u.email))) return null;
  return { id: u.id, email: u.email, name: u.name, admin: isAdminEmail(u.email) };
});

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (!user.admin) redirect("/app");
  return user;
}

/** For route handlers: the user, or a JSON error response. */
export async function apiUser() {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  return { user } as const;
}
