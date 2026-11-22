// A marker in R2 that says "a recording may be waiting for IPA". The */5 cron reads it before
// touching Neon, so the database can scale to zero while nothing is queued.
//
// Ordering that keeps it correct without locks (R2 is strongly consistent):
//   - whoever sets ipa_status = 'queued' commits that first, then calls markQueued();
//   - the cron calls takeMarker() (delete) BEFORE it counts queued rows, and puts the marker
//     back if any remain.
// A row committed after the cron's count therefore finds the marker gone and sets it again.
// A lost marker (bucket wiped, R2 error) only delays retries until the next sweep.

type MarkerBucket = Pick<R2Bucket, "head" | "put" | "delete">;

export const QUEUE_MARKER = "notebook/ipa-queue-pending";

/** Call after committing a row as queued. Never throws: the marker is an optimisation. */
export async function markQueued(bucket: MarkerBucket | undefined) {
  if (!bucket) return;
  try {
    if (!(await bucket.head(QUEUE_MARKER))) await bucket.put(QUEUE_MARKER, String(Date.now()));
  } catch (e) {
    console.error("ipa queue marker: put failed", e);
  }
}

/** Removes the marker and says whether it was there. Unreadable counts as there, so the cron checks Neon. */
export async function takeMarker(bucket: MarkerBucket | undefined) {
  if (!bucket) return true;
  try {
    if (!(await bucket.head(QUEUE_MARKER))) return false;
    await bucket.delete(QUEUE_MARKER);
    return true;
  } catch (e) {
    console.error("ipa queue marker: read failed", e);
    return true;
  }
}
