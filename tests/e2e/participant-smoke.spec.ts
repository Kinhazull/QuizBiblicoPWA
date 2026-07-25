import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
  await page.route("**/api/platform/achievements", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ achievements: [], summary: { total: 0, unlocked: 0, pending: 0 } }),
  }));
}

test("login screen remains usable without an authenticated session", async ({ page }) => {
  await mockPublicApi(page, false);
  await page.goto("/");
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator(".auth-recovery-link")).toBeVisible();
  await expect(page.locator(".participant-bottom-nav")).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("authenticated participant receives platform chrome and four-item navigation", async ({ page }) => {
  await mockPublicApi(page, true);
  await page.goto("/");
  const navigation = page.locator(".participant-bottom-nav");
  await expect(navigation).toBeVisible();
  await expect(navigation.locator("a")).toHaveCount(4);
  await expect(navigation.locator("a").allTextContents()).resolves.toEqual(["Home", "Jogos", "Recompensas", "Perfil"]);
  await expect(page.locator(".notifications-action")).toBeVisible();
  await expect(page.locator(".settings-action")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
});

const responsiveViewports = [
  { width: 320, height: 700 },
  { width: 360, height: 800 },
  { width: 375, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 800 },
  { width: 430, height: 932 },
  { width: 776, height: 1024 },
];

for (const { width, height } of responsiveViewports) {
  test(`platform Home has no page overflow or clipped controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockPublicApi(page, true);
    await page.goto("/");
    await expect(page.locator(".platform-home")).toBeVisible();

    const layout = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const carousel = document.querySelector(".platform-game-grid");
      const selectors = [
        ".platform-continue-card>header a",
        ".platform-mission-card aside",
        ".platform-daily-chest",
        ".platform-achievements",
        ".participant-bottom-nav",
      ];
      return {
        viewportWidth,
        scrollWidth: document.documentElement.scrollWidth,
        homeBottom: document.querySelector(".platform-home")?.getBoundingClientRect().bottom,
        navigationTop: document.querySelector(".participant-bottom-nav")?.getBoundingClientRect().top,
        carouselScrollsInternally: carousel instanceof HTMLElement && carousel.scrollWidth > carousel.clientWidth,
        carousel: carousel instanceof HTMLElement ? (() => {
          const firstTile = carousel.querySelector(".platform-game-tile")?.getBoundingClientRect();
          const styles = getComputedStyle(carousel);
          const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");
          return firstTile ? {
            clientWidth: carousel.clientWidth,
            firstTileWidth: firstTile.width,
            nextCardPreview: carousel.clientWidth - firstTile.width - gap,
          } : null;
        })() : null,
        bounds: selectors.map(selector => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) return { selector, missing: true };
          const rect = element.getBoundingClientRect();
          return { selector, left: rect.left, right: rect.right, width: rect.width };
        }),
      };
    });

    expect(layout.scrollWidth).toBe(layout.viewportWidth);
    expect(layout.homeBottom, "scrollable Home area is missing").toBeDefined();
    expect(layout.navigationTop, "bottom navigation is missing").toBeDefined();
    expect(layout.homeBottom!, "scrollable Home area extends behind bottom navigation").toBeLessThanOrEqual(layout.navigationTop! + 0.5);
    if (width <= 760) expect(layout.carouselScrollsInternally).toBe(true);
    if (width <= 375) {
      expect(layout.carousel, "mobile games carousel metrics are missing").not.toBeNull();
      expect(layout.carousel!.firstTileWidth, "first game card must be fully readable").toBeGreaterThan(layout.carousel!.clientWidth * 0.75);
      expect(layout.carousel!.nextCardPreview, "next game preview must remain visible").toBeGreaterThanOrEqual(24);
      expect(layout.carousel!.nextCardPreview, "next game preview must remain controlled").toBeLessThanOrEqual(48);
    }
    for (const bound of layout.bounds) {
      expect(bound).not.toHaveProperty("missing", true);
      expect(bound.left, `${bound.selector} starts outside viewport`).toBeGreaterThanOrEqual(-0.5);
      expect(bound.right, `${bound.selector} ends outside viewport`).toBeLessThanOrEqual(width + 0.5);
    }
    if (process.env.CAPTURE_HOME_EVIDENCE === "1" && [320, 360, 390, 430].includes(width)) {
      await page.screenshot({ path: `.wrangler/platform-home-${width}x${height}.png`, fullPage: false });
      await page.locator(".platform-mission-card").evaluate(element => element.scrollIntoView({ block: "start", inline: "nearest" }));
      await page.screenshot({ path: `.wrangler/platform-home-${width}x${height}-details.png`, fullPage: false });
    }
  });
}

for (const { width, height } of responsiveViewports.filter(viewport => [320, 360, 390, 430].includes(viewport.width))) {
  test(`important Home content can scroll completely above bottom navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockPublicApi(page, true);
    await page.goto("/");

    const importantSections = [
      ".platform-mission-card",
      ".platform-games",
      ".platform-daily-chest",
      ".platform-achievements",
      ".platform-preview-note",
    ];

    for (const selector of importantSections) {
      const section = page.locator(selector);
      await section.evaluate(element => element.scrollIntoView({ block: "end", inline: "nearest" }));
      const clearance = await page.evaluate(currentSelector => {
        const content = document.querySelector(currentSelector)?.getBoundingClientRect();
        const navigation = document.querySelector(".participant-bottom-nav")?.getBoundingClientRect();
        if (!content || !navigation) return null;
        return { contentBottom: content.bottom, navigationTop: navigation.top };
      }, selector);
      expect(clearance, `${selector} or bottom navigation is missing`).not.toBeNull();
      expect(clearance!.contentBottom, `${selector} remains hidden behind bottom navigation`).toBeLessThanOrEqual(clearance!.navigationTop + 0.5);
    }
  });
}

test("platform Home has no horizontal overflow on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockPublicApi(page, true);
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});

test("catalog and Game SDK keep both platform games playable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await mockPublicApi(page, true);
  const completions: Array<Record<string, unknown>> = [];
  await page.route("**/api/platform/games/finish", async route => {
    completions.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, processing: "completed" }),
    });
  });

  await page.goto("/jogos");
  await expect(page.locator(".games-catalog-card")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => document.documentElement.clientWidth),
  );

  await page.goto("/jogos/wordle-biblico");
  await page.keyboard.type("JESUS");
  await page.keyboard.press("Enter");
  await expect(page.locator(".game-sdk-result.won")).toBeVisible();
  await expect(page.getByRole("link", { name: /voltar para home/i })).toBeVisible();

  await page.goto("/jogos/jogo-das-3-pistas");
  await page.getByLabel(/qual .* resposta/i).fill("Noé");
  await page.getByRole("button", { name: /responder/i }).click();
  await expect(page.locator(".game-sdk-result.won")).toBeVisible();
  await expect.poll(() => completions.length).toBe(2);
  expect(completions.map(item => item.gameId)).toEqual(["wordle-biblico", "jogo-tres-pistas"]);

  const resultClearance = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const result = document.querySelector(".game-sdk-result")?.getBoundingClientRect();
    const navigation = document.querySelector(".participant-bottom-nav")?.getBoundingClientRect();
    return result && navigation
      ? { resultBottom: result.bottom, navigationTop: navigation.top, pageWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth }
      : null;
  });
  expect(resultClearance).not.toBeNull();
  expect(resultClearance!.resultBottom).toBeLessThanOrEqual(resultClearance!.navigationTop + 0.5);
  expect(resultClearance!.pageWidth).toBe(resultClearance!.viewportWidth);
});
