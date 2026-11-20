"use client";
import { createAuthClient } from "@neondatabase/auth/next";

export const authClient = createAuthClient();

export type AuthFailure = { message: string; code?: string; status?: number };

/**
 * The Neon Auth client throws on 4xx responses (AuthApiError) instead of always returning
 * `{ error }`. This turns both shapes into `{ data, error }` so forms never get stuck pending.
 */
export async function authCall<T>(
  p: Promise<{ data?: T | null; error?: { message?: string; code?: string; status?: number } | null }>,
): Promise<{ data: T | null; error: AuthFailure | null }> {
  try {
    const r = await p;
    if (r?.error) return { data: null, error: { message: r.error.message ?? "Something went wrong.", code: r.error.code, status: r.error.status } };
    return { data: (r?.data ?? null) as T | null, error: null };
  } catch (e) {
    const err = e as { message?: string; code?: string; status?: number };
    return { data: null, error: { message: err?.message || "Network error. Try again.", code: err?.code, status: err?.status } };
  }
}

/** Better Auth says EMAIL_NOT_VERIFIED; the Neon client maps it to email_not_confirmed. */
export const isUnverified = (e: AuthFailure | null) =>
  !!e && (e.code === "EMAIL_NOT_VERIFIED" || e.code === "email_not_confirmed");
