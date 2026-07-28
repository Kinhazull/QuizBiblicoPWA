import test from "node:test";
import assert from "node:assert/strict";
import {
  createAuthenticatedRequest,
  createSession,
  createTestDatabase,
  responseJson,
  seedOrganization,
  seedUser,
} from "../helpers/integration.mjs";
import { onRequestGet as getContent } from "../../functions/api/admin/content.ts";

function seedQuestion(ctx, {
  id,
  organizationId = "org-1",
  prompt = `Pergunta ${id}`,
  status = "active",
  reviewStatus = "approved",
  difficulty = "medium",
  category = "Evangelhos",
  book = "João",
  reference = "João 3:16",
  theme = "Salvação",
  updatedAt = 100,
} = {}) {
  ctx.raw.prepare(`INSERT INTO question_bank(
    id,organization_id,reference,book,theme,category,difficulty,prompt,normalized_prompt,
    commentary,status,review_status,version,times_used,created_by,updated_by,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,2,?,?,?,?)`).run(
    id, organizationId, reference, book, theme, category, difficulty, prompt,
    prompt.toLocaleLowerCase("pt-BR"), "Comentário", status, reviewStatus,
    `${organizationId}-admin`, `${organizationId}-admin`, 10, updatedAt,
  );
  ["Correta", "Alternativa B", "Alternativa C", "Alternativa D"].forEach((text, position) => {
    ctx.raw.prepare("INSERT INTO question_bank_choices(id,question_id,position,text,correct) VALUES(?,?,?,?,?)")
      .run(`${id}-c${position}`, id, position, text, position === 0 ? 1 : 0);
  });
}

async function fixture(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "org-1-admin", role: "admin" });
  seedUser(ctx, { id: "org-1-editor", role: "participant" });
  seedUser(ctx, { id: "org-1-member", role: "participant" });
  seedUser(ctx, { id: "org-2-admin", organizationId: "org-2", role: "admin" });
  ctx.raw.prepare("INSERT INTO user_permissions(user_id,permission_code,granted_by,granted_at) VALUES(?,?,?,0)")
    .run("org-1-editor", "questions.review", "org-1-admin");
  const tokens = {
    admin: await createSession(ctx, "org-1-admin"),
    editor: await createSession(ctx, "org-1-editor"),
    member: await createSession(ctx, "org-1-member"),
  };
  return { ctx, tokens };
}

test("universal content endpoint requires authentication and an existing content permission", async t => {
  const { ctx, tokens } = await fixture(t);
  const anonymous = await getContent({ request: new Request("https://test/api/admin/content"), env: ctx.env });
  assert.equal(anonymous.status, 401);
  const forbidden = await getContent({
    request: createAuthenticatedRequest("https://test/api/admin/content", { token: tokens.member }),
    env: ctx.env,
  });
  assert.equal(forbidden.status, 403);
  const permitted = await getContent({
    request: createAuthenticatedRequest("https://test/api/admin/content", { token: tokens.editor }),
    env: ctx.env,
  });
  assert.equal(permitted.status, 200);
  assert.equal(permitted.headers.get("cache-control"), "no-store");
});

test("legacy Quiz questions become universal summaries with safe statuses and tenant isolation", async t => {
  const { ctx, tokens } = await fixture(t);
  seedQuestion(ctx, { id: "published" });
  seedQuestion(ctx, { id: "review", status: "draft", reviewStatus: "in_review", prompt: "Revisar parábola" });
  seedQuestion(ctx, { id: "changes", status: "draft", reviewStatus: "changes_requested", prompt: "Ajustar referência" });
  seedQuestion(ctx, { id: "archived", status: "archived", prompt: "Conteúdo antigo" });
  seedQuestion(ctx, { id: "other-org", organizationId: "org-2", prompt: "Nunca expor" });
  const response = await getContent({
    request: createAuthenticatedRequest("https://test/api/admin/content?status=DRAFT", { token: tokens.admin }),
    env: ctx.env,
  });
  const data = await responseJson(response);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].id, "changes");
  assert.equal(data.items[0].gameType, "quiz-biblico");
  assert.equal(data.items[0].status, "DRAFT");
  assert.deepEqual(data.items[0].indicators, ["Ajustes solicitados"]);
  assert.ok(!JSON.stringify(data).includes("Nunca expor"));

  const archived = await responseJson(await getContent({
    request: createAuthenticatedRequest("https://test/api/admin/content?archived=1", { token: tokens.admin }),
    env: ctx.env,
  }));
  assert.deepEqual(archived.items.map(item => item.id), ["archived"]);
  assert.equal(archived.items[0].status, "ARCHIVED");
});

test("server-side game, status, difficulty, search and pagination filters remain deterministic", async t => {
  const { ctx, tokens } = await fixture(t);
  for (let index = 0; index < 12; index++) seedQuestion(ctx, {
    id: `q-${index}`,
    prompt: index === 7 ? "Quem recebeu as tábuas da Lei?" : `Pergunta bíblica ${index}`,
    difficulty: index === 7 ? "hard" : "easy",
    updatedAt: 100 + index,
  });
  const request = query => getContent({
    request: createAuthenticatedRequest(`https://test/api/admin/content?${query}`, { token: tokens.admin }),
    env: ctx.env,
  });
  const search = await responseJson(await request("q=t%C3%A1buas&difficulty=HARD"));
  assert.deepEqual(search.items.map(item => item.id), ["q-7"]);
  assert.equal(search.items[0].difficulty, "HARD");

  const page1 = await responseJson(await request("page=1&pageSize=10"));
  const page2 = await responseJson(await request("page=2&pageSize=10"));
  assert.equal(page1.items.length, 10);
  assert.equal(page1.pagination.total, 12);
  assert.equal(page1.pagination.hasMore, true);
  assert.equal(page2.items.length, 2);
  assert.equal(page2.pagination.hasMore, false);

  const unsupportedGame = await responseJson(await request("game=wordle-biblico"));
  assert.equal(unsupportedGame.items.length, 0);
  assert.equal(unsupportedGame.pagination.total, 0);
});

test("content dashboard counts Quiz persistence and reports exact zero for six pending integrations", async t => {
  const { ctx, tokens } = await fixture(t);
  seedQuestion(ctx, { id: "published" });
  seedQuestion(ctx, { id: "review", status: "draft", reviewStatus: "in_review" });
  seedQuestion(ctx, { id: "archived", status: "archived" });
  const response = await getContent({
    request: createAuthenticatedRequest("https://test/api/admin/content?view=dashboard", { token: tokens.admin }),
    env: ctx.env,
  });
  const data = await responseJson(response);
  assert.equal(data.total, 3);
  assert.equal(data.archived, 1);
  assert.equal(data.needsReview, 1);
  assert.equal(data.byGame.find(game => game.gameType === "quiz-biblico").count, 3);
  assert.equal(data.byGame.filter(game => !game.integrated).length, 6);
  assert.ok(data.byGame.filter(game => !game.integrated).every(game => game.count === 0));
});
