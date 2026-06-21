// =============================================================================
// VANTA OS — E2E: Legal pages render correctly (Section 11)
// =============================================================================

import { test, expect } from "@playwright/test";

test.describe("VANTA OS — Legal pages", () => {
  test("privacy policy page renders with draft notice", async ({ page }) => {
    await page.goto("/app/privacy");

    await expect(page.locator("h1")).toContainText("Privacy Policy");
    await expect(page.locator("text=DRAFT")).toBeVisible();
    await expect(page.locator("text=Data We Collect")).toBeVisible();
    await expect(page.locator("text=Google Gemini")).toBeVisible();
    await expect(page.locator("text=GDPR")).toBeVisible();
  });

  test("terms of service page renders with liability section", async ({ page }) => {
    await page.goto("/app/terms");

    await expect(page.locator("h1")).toContainText("Terms of Service");
    await expect(page.locator("text=Limitation of Liability")).toBeVisible();
    await expect(page.locator("text=Kill Switch")).toBeVisible();
  });
});
