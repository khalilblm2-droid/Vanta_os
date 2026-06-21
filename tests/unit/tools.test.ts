// =============================================================================
// VANTA OS — Tool Registry Tests (Section 41, Section 8)
// Verifies permission guardrails + kill switch block disallowed tool calls.
// =============================================================================

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("~/lib/db.server", () => ({
  prisma: {
    shop: { findUnique: vi.fn() },
    undoSnapshot: { create: vi.fn() },
    taskDiff: { createMany: vi.fn() },
  },
}));

vi.mock("~/lib/shopify/multi-tenant", () => ({
  isKillSwitchOn: vi.fn(),
}));

vi.mock("~/lib/shopify/admin.client", () => ({
  adminGraphQL: vi.fn(),
  GraphQLError: class extends Error {},
  shouldUseBulkOperations: () => false,
  shopifyResourceUrl: vi.fn(),
}));

import { executeTool, TOOLS } from "~/lib/ai/tools";
import { isKillSwitchOn } from "~/lib/shopify/multi-tenant";

const baseCtx = {
  shopDomain: "test.myshopify.com",
  shopId: "shop-1",
  taskId: "task-1",
  staffId: undefined,
  admin: {} as never,
  permissions: {
    canWriteProducts: true,
    canWriteCollections: true,
    canWriteInventory: true,
    canWriteMetafields: true,
    canWriteThemes: false,
    canReadOrders: false,
    canReadCustomers: false,
  },
};

describe("Tool Registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isKillSwitchOn as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("blocks tool execution when kill switch is on", async () => {
    (isKillSwitchOn as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const r = await executeTool(baseCtx, "list_products", {});
    expect(r.success).toBe(false);
    expect(r.message).toContain("globally disabled");
  });

  it("blocks tool when required permission is missing", async () => {
    // list_orders requires canReadOrders which is false in baseCtx
    const r = await executeTool(baseCtx, "list_orders", { limit: 10 });
    expect(r.success).toBe(false);
    expect(r.message).toContain("canReadOrders");
  });

  it("returns unknown-tool error for invalid tool names", async () => {
    const r = await executeTool(baseCtx, "nonexistent_tool", {});
    expect(r.success).toBe(false);
    expect(r.message).toContain("Unknown tool");
  });

  it("exposes all expected tools in the registry", () => {
    const expected = [
      "list_products",
      "find_zero_inventory_products",
      "update_product_price",
      "bulk_update_product_tags",
      "generate_seo_description",
      "update_product_metafield",
      "list_orders",
    ];
    for (const name of expected) {
      expect(TOOLS[name]).toBeDefined();
    }
  });

  it("marks modifying tools correctly", () => {
    expect(TOOLS.update_product_price.modifies).toBe(true);
    expect(TOOLS.update_product_metafield.modifies).toBe(true);
    expect(TOOLS.bulk_update_product_tags.modifies).toBe(true);
    expect(TOOLS.list_products.modifies).toBe(false);
    expect(TOOLS.find_zero_inventory_products.modifies).toBe(false);
  });
});
