import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const mobileWidths = [320, 360, 390, 412];

test("RC login and legal surface is accessible across supported mobile widths", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "unauthorized" }),
  }));
  for (const width of mobileWidths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "ENTRAR" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Termos de Uso" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacidade" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  }
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations.filter(item => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("RC exposes valid install resources and never caches API responses", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ name: expect.stringMatching(/^Conte os Feitos/), start_url: "/", scope: "/", display: "standalone" });
  for (const icon of ["/app-icon-192.png", "/app-icon-512.png", "/apple-touch-icon.png"]) {
    expect((await request.get(icon)).ok(), icon).toBeTruthy();
  }
  const worker = await (await request.get("/sw.js")).text();
  expect(worker).toContain("startsWith('/api/')");
  expect(worker).toContain("SKIP_WAITING");
  expect(worker).not.toContain("SHELL=['/'");
});

test("protected deep link returns safely to authentication without redirect loop", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "unauthorized" }) }));
  await page.route("**/api/profile/me", route => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "unauthorized" }) }));
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "ENTRAR" })).toBeVisible();
});

test("low-end mobile profile keeps the initial public interaction within a pragmatic RC budget", async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "CDP throttling is a Chromium contract");
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 1_600_000 / 8,
    uploadThroughput: 750_000 / 8,
  });
  await page.route("**/api/auth/me", route => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "unauthorized" }) }));
  const startedAt = Date.now();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "ENTRAR" })).toBeVisible();
  const interactiveMs = Date.now() - startedAt;
  testInfo.annotations.push({ type: "mobile-low-end-interactive-ms", description: String(interactiveMs) });
  // next dev includes on-demand compilation; this budget detects a severe regression,
  // while public Web Vitals remain a post-deploy measurement on CDN/Workers.
  expect(interactiveMs).toBeLessThan(15_000);
});
