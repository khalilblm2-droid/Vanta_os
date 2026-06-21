// =============================================================================
// VANTA OS — Rate limiter tests (Section 41, Section 13)
// Uses the in-memory fallback (Redis not required for these tests).
// =============================================================================

import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit } from "~/lib/security/rate-limit";

describe("rateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    // Force in-memory by temporarily disabling redis
    process.env.REDIS_URL = "redis://invalid:9999";
  });

  it("allows requests within the limit", async () => {
    const key = `test-allow-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit({ key, limit: 10, windowSec: 60 });
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks requests that exceed the limit", async () => {
    const key = `test-block-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      await rateLimit({ key, limit: 3, windowSec: 60 });
    }
    const r = await rateLimit({ key, limit: 3, windowSec: 60 });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("counts remaining requests correctly", async () => {
    const key = `test-remaining-${Math.random()}`;
    await rateLimit({ key, limit: 5, windowSec: 60 });
    await rateLimit({ key, limit: 5, windowSec: 60 });
    const r = await rateLimit({ key, limit: 5, windowSec: 60 });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });
});
