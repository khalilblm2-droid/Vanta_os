// =============================================================================
// VANTA OS — E2E: Install → Onboarding → Trigger Task → Task Completion
// Section 41 baseline test
// =============================================================================

import { test, expect } from "@playwright/test";

test.describe("VANTA OS — Core flow", () => {
  test("onboarding splash loads and accepts terms", async ({ page }) => {
    await page.goto("/app/onboarding");

    // Title visible
    await expect(page.locator("h1")).toContainText("Welcome to VANTA OS");

    // Connect button is disabled until checkbox is checked
    const connectBtn = page.locator('button[type="submit"]');
    await expect(connectBtn).toBeDisabled();

    // Check the consent checkbox
    await page.check('input[type="checkbox"]');

    // Button becomes enabled
    await expect(connectBtn).toBeEnabled();

    // Submit
    await connectBtn.click();

    // Should redirect to /app (dashboard)
    await page.waitForURL("**/app", { timeout: 10_000 });
    await expect(page.locator("h1")).toBeVisible();
  });

  test("dashboard shows stats and recent activity", async ({ page }) => {
    await page.goto("/app");

    // Stats cards visible
    await expect(page.locator("text= Credits remaining")).toBeVisible();
    await expect(page.locator("text=Recent activity")).toBeVisible();
  });

  test("agent canvas shows empty state with prompt starters", async ({ page }) => {
    await page.goto("/app/canvas");

    // Empty state visible
    await expect(page.locator("text=Try one of these to get started")).toBeVisible();

    // 4 prompt starter buttons
    const starters = page.locator("button", { hasText: /Find|Draft|Analyze|Add/ });
    await expect(starters).toHaveCount(4);

    // Clicking a starter populates the input
    await starters.first().click();
    const textarea = page.locator("textarea");
    await expect(textarea).not.toBeEmpty();
  });

  test("command palette opens with Cmd+K", async ({ page }) => {
    await page.goto("/app");

    // Open palette
    await page.keyboard.press("Meta+K");

    // Search input visible
    await expect(page.locator('input[aria-label="Type a command or search..."]')).toBeVisible();

    // Type a query
    await page.fill('input[aria-label="Type a command or search..."]', "Find all products with 0 inventory");

    // Press Escape to close
    await page.keyboard.press("Escape");
  });

  test("settings page allows toggling kill switch", async ({ page }) => {
    await page.goto("/app/settings");

    // Kill switch section visible
    await expect(page.locator("text=Emergency Kill Switch")).toBeVisible();

    // Toggle it
    const killSwitchToggle = page.locator('button[aria-label="Disable agent globally"]');
    await killSwitchToggle.click();

    // Confirmation appears
    await expect(page.locator("text=Confirm")).toBeVisible();
    await page.click("text=Confirm");

    // Toggle is now active
    await expect(killSwitchToggle).toHaveAttribute("aria-checked", "true");
  });

  test("task history page loads", async ({ page }) => {
    await page.goto("/app/history");

    // Title visible
    await expect(page.locator("h1")).toContainText("Task History");

    // Search input visible
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test("mobile responsive at 375px width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/app");

    // Layout doesn't overflow horizontally
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});
