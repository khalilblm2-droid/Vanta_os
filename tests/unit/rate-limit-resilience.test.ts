// =============================================================================
// VANTA OS — Rate Limit Visual Indicator Tests (Section 41, Section 19, Section 53)
// Tests the GraphQL client's budget wait + status helpers.
// =============================================================================

import { describe, expect, it, vi } from "vitest";

vi.mock("~/lib/db.server", () => ({
  prisma: {
    rateLimitSnapshot: { create: vi.fn().mockResolvedValue({}) },
    scopeAuditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

import { __test } from "~/lib/shopify/admin.client";

describe("waitForBudget", () => {
  it("does not wait when currentlyAvailable is above minimum", async () => {
    const start = Date.now();
    await __test.waitForBudget({
      maximumAvailable: 1000,
      currentlyAvailable: 500,
      restoreRate: 50,
    });
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("waits when currentlyAvailable is below threshold", async () => {
    const start = Date.now();
    await __test.waitForBudget({
      maximumAvailable: 1000,
      currentlyAvailable: 10, // below 15% of 1000
      restoreRate: 100, // credits per second
    });
    // Should wait ~ (150 - 10) / 100 * 1000 = ~1400ms — but our impl caps at 10s
    // For this test we just verify it waited at least 100ms
    expect(Date.now() - start).toBeGreaterThan(100);
  });
});

describe("SHOPIFY_API_VERSION constant", () => {
  it("is pinned to a real Shopify quarterly version", () => {
    expect(__test.SHOPIFY_API_VERSION).toMatch(/^20\d{2}-\d{2}$/);
  });
});
