// =============================================================================
// VANTA OS — App Events Billing Tests (Section 41, Section 5.3)
// Verifies credit consumption + local event persistence.
// =============================================================================

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("~/lib/db.server", () => ({
  prisma: {
    shop: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({
        plan: "FREE",
        planStatus: "ACTIVE",
        creditsRemaining: 95,
        creditsUsedCycle: 5,
        cycleResetAt: null,
      }),
    },
    appEvent: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "evt-1", ...data }),
      ),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("~/lib/logger.server", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { consumeCredits, getActiveSubscription } from "~/lib/billing/app-events";
import { prisma } from "~/lib/db.server";

describe("consumeCredits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("decrements shop.creditsRemaining + increments creditsUsedCycle", async () => {
    await consumeCredits("test.myshopify.com", "task-1", 5);
    expect(prisma.shop.update).toHaveBeenCalledWith({
      where: { shopDomain: "test.myshopify.com" },
      data: {
        creditsUsedCycle: { increment: 5 },
        creditsRemaining: { decrement: 5 },
      },
    });
  });

  it("persists an AppEvent row locally", async () => {
    await consumeCredits("test.myshopify.com", "task-1", 3);
    expect(prisma.appEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopDomain: "test.myshopify.com",
          taskId: "task-1",
          eventName: "CREDIT_USED",
          credits: 3,
        }),
      }),
    );
  });

  it("skips when credits is 0 or negative", async () => {
    await consumeCredits("test.myshopify.com", "task-1", 0);
    expect(prisma.shop.update).not.toHaveBeenCalled();
  });
});

describe("getActiveSubscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns local subscription state when Partner API is not configured", async () => {
    const r = await getActiveSubscription("test.myshopify.com");
    expect(r).toEqual({
      plan: "FREE",
      status: "ACTIVE",
      creditsRemaining: 95,
      creditsUsedCycle: 5,
      cycleResetAt: null,
    });
  });
});
