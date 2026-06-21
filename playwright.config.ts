import { defineConfig, devices } from "@playwright/test";

/**
 * VANTA OS — Playwright E2E config (Section 41)
 * Covers: Install -> Onboarding -> Trigger Task -> Task Completion
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Shopify dev store tests should run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-iphone-14",
      use: { ...devices["iPhone 14"] }, // Section 51 — 390px width
    },
    {
      name: "mobile-iphone-se",
      use: { ...devices["iPhone SE"] }, // Section 51 — 375px width
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
