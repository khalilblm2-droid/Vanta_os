// =============================================================================
// VANTA OS — HMAC Verification Tests (Section 41, Section 5.2)
// Verifies the webhook HMAC verification path used by every webhook route.
// =============================================================================

import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookHmac, extractWebhookHeaders } from "~/lib/shopify/webhooks.server";

const SECRET = "test_secret";

function sign(body: string, secret: string = SECRET): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

describe("verifyWebhookHmac", () => {
  it("accepts a correctly-signed payload", () => {
    const body = JSON.stringify({ shop_domain: "test.myshopify.com" });
    const hmac = sign(body);
    expect(verifyWebhookHmac(body, hmac)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const body = JSON.stringify({ foo: "bar" });
    const hmac = sign(body, "wrong_secret");
    expect(verifyWebhookHmac(body, hmac)).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const body = JSON.stringify({ foo: "bar" });
    const hmac = sign(body);
    const tampered = JSON.stringify({ foo: "MALICIOUS" });
    expect(verifyWebhookHmac(tampered, hmac)).toBe(false);
  });

  it("returns false when hmac header is null", () => {
    expect(verifyWebhookHmac("body", null)).toBe(false);
  });

  it("returns false on malformed base64", () => {
    expect(verifyWebhookHmac("body", "not-valid-base64!!!")).toBe(false);
  });
});

describe("extractWebhookHeaders", () => {
  it("extracts all standard Shopify webhook headers", () => {
    const request = new Request("https://example.com/webhooks", {
      headers: {
        "X-Shopify-Hmac-Sha256": "abc123",
        "X-Shopify-Shop-Domain": "test.myshopify.com",
        "X-Shopify-Topic": "customers/redact",
        "X-Shopify-API-Version": "2025-04",
        "X-Shopify-Webhook-Id": "wh-12345",
      },
    });
    const h = extractWebhookHeaders(request);
    expect(h.shopifyHmac).toBe("abc123");
    expect(h.shopifyShop).toBe("test.myshopify.com");
    expect(h.shopifyTopic).toBe("customers/redact");
    expect(h.shopifyApiVersion).toBe("2025-04");
    expect(h.webhookId).toBe("wh-12345");
  });

  it("returns nulls for missing headers", () => {
    const request = new Request("https://example.com/webhooks");
    const h = extractWebhookHeaders(request);
    expect(h.shopifyHmac).toBeNull();
    expect(h.shopifyShop).toBeNull();
    expect(h.shopifyTopic).toBeNull();
    expect(h.webhookId).toBeNull();
  });
});
