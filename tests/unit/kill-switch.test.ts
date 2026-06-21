// =============================================================================
// VANTA OS — Kill Switch Tests (Section 41, Section 43)
// =============================================================================

import { describe, expect, it, vi, beforeEach } from "vitest";
import { isKillSwitchOn } from "~/lib/shopify/multi-tenant";

// Mock prisma
vi.mock("~/lib/db.server", () => ({
  prisma: {
    shop: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "~/lib/db.server";

describe("isKillSwitchOn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when shop.killSwitchEnabled is true", async () => {
    (prisma.shop.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      killSwitchEnabled: true,
    });
    expect(await isKillSwitchOn("test.myshopify.com")).toBe(true);
  });

  it("returns false when shop.killSwitchEnabled is false", async () => {
    (prisma.shop.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      killSwitchEnabled: false,
    });
    expect(await isKillSwitchOn("test.myshopify.com")).toBe(false);
  });

  it("returns false when shop is not found", async () => {
    (prisma.shop.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await isKillSwitchOn("unknown.myshopify.com")).toBe(false);
  });
});
