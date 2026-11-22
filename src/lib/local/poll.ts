// When the open app should check the server again on its own. Every check wakes Neon (session,
// device and sync queries), and Neon bills until 5 min after the last query, so a tab left open
// on a clinic laptop must stop polling once nobody is using it. Edits, focus and reconnects
// still sync straight away (src/lib/local/sync.ts), so coming back to the tab is never stale.

/** While IPA is on its way: check often, so the transcript shows up soon after Modal answers. */
export const PENDING_POLL_MS = 20_000;
/** While someone is using the app. */
export const ACTIVE_POLL_MS = 60_000;
/** No input for this long: stop polling, unless IPA is pending. */
export const ACTIVE_FOR_MS = 10 * 60_000;
/** No input for this long: stop polling even if IPA is pending (it arrives on the next visit). */
export const PENDING_FOR_MS = 30 * 60_000;

/** Delay until the next background check, or null for none. */
export function nextPollDelay(o: { pending: boolean; lastInputAt: number; now: number }): number | null {
  const idle = o.now - o.lastInputAt;
  if (o.pending && idle < PENDING_FOR_MS) return PENDING_POLL_MS;
  if (idle < ACTIVE_FOR_MS) return ACTIVE_POLL_MS;
  return null;
}
