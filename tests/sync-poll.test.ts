import { describe, expect, it } from "vitest";
import { ACTIVE_FOR_MS, ACTIVE_POLL_MS, nextPollDelay, PENDING_FOR_MS, PENDING_POLL_MS } from "@/lib/local/poll";

const now = 1_000_000_000;
const after = (ms: number) => ({ lastInputAt: now - ms, now });

describe("nextPollDelay", () => {
  it("polls fast while IPA is pending", () => {
    expect(nextPollDelay({ pending: true, ...after(0) })).toBe(PENDING_POLL_MS);
    expect(nextPollDelay({ pending: true, ...after(ACTIVE_FOR_MS + 1) })).toBe(PENDING_POLL_MS);
  });

  it("polls every minute while the app is in use", () => {
    expect(nextPollDelay({ pending: false, ...after(0) })).toBe(ACTIVE_POLL_MS);
    expect(nextPollDelay({ pending: false, ...after(ACTIVE_FOR_MS - 1) })).toBe(ACTIVE_POLL_MS);
  });

  it("stops once the tab sits unused", () => {
    expect(nextPollDelay({ pending: false, ...after(ACTIVE_FOR_MS) })).toBeNull();
    expect(nextPollDelay({ pending: true, ...after(PENDING_FOR_MS) })).toBeNull();
  });
});
