import { describe, expect, it } from "vitest";
import { QUEUE_MARKER, markQueued, takeMarker } from "@/lib/ipa-queue";

function fakeBucket() {
  const keys = new Map<string, string>();
  const b = {
    keys,
    head: async (k: string) => (keys.has(k) ? ({ key: k } as R2Object) : null),
    put: async (k: string, v: string) => {
      keys.set(k, v);
      return { key: k } as R2Object;
    },
    delete: async (k: string | string[]) => {
      for (const x of [k].flat()) keys.delete(x);
    },
  };
  return b as typeof b & Pick<R2Bucket, "head" | "put" | "delete">;
}

describe("IPA queue marker", () => {
  it("is set once and taken once", async () => {
    const b = fakeBucket();
    expect(await takeMarker(b)).toBe(false);
    await markQueued(b);
    await markQueued(b);
    expect(b.keys.has(QUEUE_MARKER)).toBe(true);
    expect(await takeMarker(b)).toBe(true);
    expect(await takeMarker(b)).toBe(false);
  });

  it("survives a row queued between the cron's take and its count", async () => {
    const b = fakeBucket();
    await markQueued(b);
    expect(await takeMarker(b)).toBe(true); // cron: take, then count sees 0 and doesn't re-put
    await markQueued(b); // route: commits after the count, then marks
    expect(await takeMarker(b)).toBe(true); // next cron run checks Neon
  });

  it("falls back to checking Neon when R2 is missing or failing", async () => {
    expect(await takeMarker(undefined)).toBe(true);
    const broken = { ...fakeBucket(), head: async () => Promise.reject(new Error("r2 down")) };
    expect(await takeMarker(broken)).toBe(true);
    await expect(markQueued(broken)).resolves.toBeUndefined();
  });
});
