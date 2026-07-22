import { expect, test, type Page, type Route } from "@playwright/test";
import {
  createTestDatabase,
  createValidRound,
  seedOrganization,
  seedUser,
} from "../helpers/integration.mjs";
import { hashPassword } from "../../functions/_lib/security.ts";
import { onRequestPost as login } from "../../functions/api/auth/login.ts";
import { onRequestGet as me } from "../../functions/api/auth/me.ts";
import { onRequestPost as logout } from "../../functions/api/auth/logout.ts";
import { onRequestGet as status } from "../../functions/api/rounds/status.ts";
import { onRequestGet as current } from "../../functions/api/rounds/current.ts";
import { onRequestGet as notifications } from "../../functions/api/notifications.ts";
import { onRequestGet as badges } from "../../functions/api/badges.ts";
import { onRequestPost as start } from "../../functions/api/attempts/start.ts";
import { onRequestPost as answer } from "../../functions/api/attempts/[id]/answer.ts";
import { onRequestPost as advance } from "../../functions/api/attempts/[id]/advance.ts";
import { onRequestPost as finish } from "../../functions/api/attempts/[id]/finish.ts";
import { onRequestGet as rankings } from "../../functions/api/rankings.ts";
import { onRequestGet as profile } from "../../functions/api/profile/me.ts";

async function fulfill(route: Route, response: Response) {
  await route.fulfill({
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: Buffer.from(await response.arrayBuffer()),
  });
}

async function installRealApi(page: Page, env: any) {
  await page.route("**/api/**", async (route) => {
    try {
    const original = route.request();
    const url = new URL(original.url());
    const request = new Request(original.url(), {
      method: original.method(),
      headers: original.headers(),
      body: ["GET", "HEAD"].includes(original.method())
        ? undefined
        : original.postData() || undefined,
    });
    const id = url.pathname.match(/^\/api\/attempts\/([^/]+)\//)?.[1];
    let response: Response;
    if (url.pathname === "/api/auth/login")
      response = await login({ request, env });
    else if (url.pathname === "/api/auth/me")
      response = await me({ request, env });
    else if (url.pathname === "/api/auth/logout")
      response = await logout({ request, env });
    else if (url.pathname === "/api/rounds/status")
      response = await status({ request, env });
    else if (url.pathname === "/api/rounds/current")
      response = await current({ request, env });
    else if (url.pathname === "/api/notifications")
      response = await notifications({ request, env });
    else if (url.pathname === "/api/badges")
      response = await badges({ request, env });
    else if (url.pathname === "/api/attempts/start")
      response = await start({ request, env });
    else if (url.pathname.endsWith("/answer") && id)
      response = await answer({ request, env, params: { id } });
    else if (url.pathname.endsWith("/advance") && id)
      response = await advance({ request, env, params: { id } });
    else if (url.pathname.endsWith("/finish") && id)
      response = await finish({ request, env, params: { id } });
      else if (url.pathname === "/api/rankings")
        response = await rankings({ request, env });
      else if (url.pathname === "/api/profile/me")
        response = await profile({ request, env });
    else
      response = new Response(
        JSON.stringify({ error: "unhandled_test_route", path: url.pathname }),
        { status: 501, headers: { "content-type": "application/json" } },
      );
      await fulfill(route, response);
    } catch (error) {
      console.error("real-api-dispatch-failed", route.request().url(), error);
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "test_dispatch_failed" }),
      });
    }
  });
}

test("browser completes a real handler and SQLite journey, ranking and logout flow", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The real-backend contract runs once; responsive behavior is covered by participant-smoke.",
  );
  test.setTimeout(120_000);
  const context = createTestDatabase();
  try {
    seedOrganization(context);
    const password = "Senha E2E forte 123!";
    const credential = await hashPassword(password, "e2e-browser-salt");
    seedUser(context, {
      id: "browser-user",
      username: "browser",
      displayName: "Pessoa E2E",
      passwordHash: credential.hash,
      passwordSalt: credential.salt,
    });
    createValidRound(context, { createdBy: "browser-user", attemptLimit: 2 });
    await installRealApi(page, context.env);

    await page.goto("/");
    await page.locator('input[name="username"]').fill("browser");
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".participant-bottom-nav")).toBeVisible();
    const roundProbe = await page.evaluate(async () => {
      const response = await fetch("/api/rounds/current");
      return { status: response.status, body: await response.json() };
    });
    expect(roundProbe).toMatchObject({ status: 200, body: { round: { id: "round-1" } } });

    await page.goto("/jogar");
    await page.getByRole("button", { name: /iniciar jornada/i }).click();
    for (let index = 0; index < 10; index += 1) {
      await page.getByRole("button", { name: /Correta \d+/ }).click();
      const nextButton = page.getByRole("button", {
        name: index === 9 ? /finalizar/i : /próxima/i,
      });
      await expect(nextButton).toBeVisible();
      await nextButton.click();
    }
    await expect(page.getByText(/10\/10/)).toBeVisible();
    await page.getByRole("button", { name: /ver rankings/i }).click();
    await expect(page.getByText("Pessoa E2E")).toBeVisible();

    await page.goto("/perfil");
    await page.getByRole("button", { name: /sair da conta/i }).click();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    expect(
      context.raw.prepare("SELECT COUNT(*) total FROM sessions").get()?.total,
    ).toBe(0);
    expect(
      context.raw.prepare("SELECT COUNT(*) total FROM attempt_answers").get()
        ?.total,
    ).toBe(10);
  } finally {
    context.close();
  }
});
