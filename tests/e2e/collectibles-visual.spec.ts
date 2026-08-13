import { expect, test, type Page, type Route } from "@playwright/test";

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

const items = [
  { id: "avatar-lion", category: "avatar", name: "Avatar Leão", description: "Coragem e força.", price: 100, icon: "🦁", owned: true, equipped: true },
  { id: "frame-gold", category: "frame", name: "Moldura Ouro", description: "Grandes conquistas.", price: 120, icon: "🥇", owned: true, equipped: true },
];

async function mock(page: Page) {
  await page.route("**/api/auth/me", route => json(route, { user: { id: "collector", displayName: "Ana", role: "participant" } }));
  await page.route("**/api/notifications", route => json(route, { unread: 0, notifications: [] }));
  await page.route("**/api/platform/shop", route => json(route, { balance: 250, items }));
  await page.route("**/api/platform/inventory", route => json(route, { items, equipped: { avatar: "avatar-lion", frame: "frame-gold" } }));
}

test("Loja e Inventário exibem arte oficial sem overflow em desktop e mobile", async ({ page }) => {
  await mock(page);
  for (const viewport of [{ width: 360, height: 800 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/loja");
    await expect(page.locator(".collectible-art img")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
    await page.goto("/inventario");
    await expect(page.locator(".collectible-art img")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  }
});
