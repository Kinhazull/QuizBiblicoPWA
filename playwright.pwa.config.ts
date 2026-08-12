import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pwa-release",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:8789",
    trace: "retain-on-failure",
    serviceWorkers: "allow",
  },
  projects: [
    { name: "pwa-release-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "pwa-release-mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "pnpm exec wrangler pages dev out --d1 DB=00000000-0000-4000-8000-000000000002 --compatibility-date 2026-07-15 --compatibility-flag nodejs_compat --persist-to .wrangler/pwa-release-state --ip 127.0.0.1 --port 8789",
    url: "http://127.0.0.1:8789/manifest.webmanifest",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
