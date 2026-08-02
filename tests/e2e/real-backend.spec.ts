import { expect, test, type Page, type Route } from "@playwright/test";
import {
  createTestDatabase,
  seedOrganization,
  seedUser,
} from "../helpers/integration.mjs";
import { hashPassword } from "../../functions/_lib/security.ts";
import {
  createUniversalDraft,
  transitionUniversalContentStatus,
} from "../../functions/_lib/universal-content-store.ts";
import { onRequestPost as login } from "../../functions/api/auth/login.ts";
import { onRequestGet as me } from "../../functions/api/auth/me.ts";
import { onRequestPost as logout } from "../../functions/api/auth/logout.ts";
import { onRequestGet as notifications } from "../../functions/api/notifications.ts";
import { onRequestGet as badges } from "../../functions/api/badges.ts";
import { onRequestGet as profile } from "../../functions/api/profile/me.ts";
import { onRequestPost as generateFreePlay } from "../../functions/api/platform/free-play/generate.ts";
import { onRequestPost as startFreePlay } from "../../functions/api/platform/free-play/start.ts";
import { onRequestGet as getFreePlaySelection } from "../../functions/api/platform/free-play/selection.ts";
import { onRequestPost as validateFreePlayAction } from "../../functions/api/platform/free-play/action.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";

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
      let response: Response;
      if (url.pathname === "/api/auth/login")
        response = await login({ request, env });
      else if (url.pathname === "/api/auth/me")
        response = await me({ request, env });
      else if (url.pathname === "/api/auth/logout")
        response = await logout({ request, env });
      else if (url.pathname === "/api/notifications")
        response = await notifications({ request, env });
      else if (url.pathname === "/api/badges")
        response = await badges({ request, env });
      else if (url.pathname === "/api/profile/me")
        response = await profile({ request, env });
      else if (url.pathname === "/api/platform/free-play/generate")
        response = await generateFreePlay({ request, env });
      else if (url.pathname === "/api/platform/free-play/start")
        response = await startFreePlay({ request, env });
      else if (url.pathname === "/api/platform/free-play/selection")
        response = await getFreePlaySelection({ request, env });
      else if (url.pathname === "/api/platform/free-play/action")
        response = await validateFreePlayAction({ request, env });
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

async function publishQuizQuestions(env: any) {
  for (let index = 0; index < 5; index += 1) {
    const draft = await createUniversalDraft(env, "org-1", "browser-user", {
      gameType: GameType.QUIZ,
      status: ContentStatus.DRAFT,
      metadata: {
        category: "Conhecimento bíblico",
        tags: ["e2e"],
        difficulty: "MEDIUM",
        biblicalReference: `Referência ${index + 1}`,
        status: ContentStatus.DRAFT,
        internalNotes: null,
      },
      payload: {
        prompt: `Pergunta E2E ${index + 1}`,
        choices: [
          { text: `Correta ${index + 1}`, correct: true },
          { text: `Incorreta A ${index + 1}`, correct: false },
          { text: `Incorreta B ${index + 1}`, correct: false },
          { text: `Incorreta C ${index + 1}`, correct: false },
        ],
        book: "Gênesis",
        theme: "E2E",
        explanation: `Explicação ${index + 1}`,
      },
    });
    expect(draft.ok).toBe(true);
    if (!draft.ok || !draft.content) throw new Error("quiz_e2e_draft_failed");
    const published = await transitionUniversalContentStatus(
      env,
      "org-1",
      "browser-user",
      draft.content.id,
      ContentStatus.PUBLISHED,
      draft.content.version,
    );
    expect(published.ok).toBe(true);
  }
}

test("browser completes the universal Quiz, returns to Games and logs out", async ({
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
    await publishQuizQuestions(context.env);
    await installRealApi(page, context.env);

    await page.goto("/");
    await page.locator('input[name="username"]').fill("browser");
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".participant-bottom-nav")).toBeVisible();

    await page.goto("/jogar");
    for (let index = 0; index < 5; index += 1) {
      await page.getByRole("button", { name: /Correta \d+/ }).click();
      const nextButton = page.getByRole("button", {
        name: index === 4 ? /finalizar/i : /próxima/i,
      });
      await expect(nextButton).toBeVisible();
      await nextButton.click();
    }
    await expect(page.getByText(/5\/5/)).toBeVisible();
    await expect(page.getByRole("button", { name: /jogar novamente/i })).toBeVisible();
    await page.getByRole("button", { name: /voltar aos jogos/i }).click();
    await expect(page).toHaveURL(/\/jogos\/?$/);

    await page.goto("/perfil");
    await page.getByRole("button", { name: /sair da conta/i }).click();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    expect(
      context.raw.prepare("SELECT COUNT(*) total FROM sessions").get()?.total,
    ).toBe(0);
    expect(
      context.raw.prepare(
        "SELECT COUNT(*) total FROM generated_game_participations WHERE game_type=? AND status='FINISHED'",
      ).get(GameType.QUIZ)?.total,
    ).toBe(1);
  } finally {
    context.close();
  }
});
