// =============================================================================
// VANTA OS — Multi-tenant scoping tests (Section 41, Section 44)
// Verifies that shopScoped throws on missing shopDomain — preventing
// cross-tenant data leakage.
// =============================================================================

import { describe, expect, it } from "vitest";
import { shopScoped, assertShopDomain } from "~/lib/shopify/multi-tenant";

describe("shopScoped", () => {
  it("returns the where-clause fragment for a valid shopDomain", () => {
    expect(shopScoped("test.myshopify.com")).toEqual({ shopDomain: "test.myshopify.com" });
  });

  it("throws on empty shopDomain", () => {
    expect(() => shopScoped("")).toThrow();
  });

  it("throws on whitespace-only shopDomain", () => {
    expect(() => shopScoped("   ")).toThrow();
  });
});

describe("assertShopDomain", () => {
  it("passes through valid domains", () => {
    expect(() => assertShopDomain("test.myshopify.com")).not.toThrow();
  });

  it("throws on null", () => {
    expect(() => assertShopDomain(null)).toThrow();
  });

  it("throws on undefined", () => {
    expect(() => assertShopDomain(undefined)).toThrow();
  });
});
