import { expect, test } from "@playwright/test";

const participant = {
  id: "e2e-user",
  displayName: "Participante E2E",
  role: "participant",
  mustChangePassword: false,
};

async function mockPublicApi(page: import("@playwright/test").Page, authenticated: boolean) {
  await page.route("**/api/auth/me", route => route.fulfill({
    status: authenticated ? 200 : 401,
    contentType: "application/json",
    body: JSON.stringify(authenticated ? { user: participant } : { error: "unauthorized" }),
  }));
  await page.route("**/api/notifications", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ unread: 0, notifications: [] }),
  }));
  await page.route("**/api/rounds/status", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ state: "empty" }),
  }));
  await page.route("**/api/badges", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ badges: [], newBadges: [] }),
  }));
}

test("login screen remains usable without an authenticated session", async ({ page }) => {
  await mockPublicApi(page, false);
  await page.goto("/");
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator(".auth-recovery-link")).toBeVisible();
  await expect(page.locator(".participant-bottom-nav")).toHaveCount(0);
});

test("authenticated participant receives chrome and five-item navigation", async ({ page }) => {
  await mockPublicApi(page, true);
  await page.goto("/");
  const navigation = page.locator(".participant-bottom-nav");
  await expect(navigation).toBeVisible();
  await expect(navigation.locator("a")).toHaveCount(5);
  await expect(page.locator(".notifications-action")).toBeVisible();
  await expect(page.locator(".settings-action")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});
