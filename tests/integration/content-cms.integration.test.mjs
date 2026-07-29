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
import { onRequestPost as createContent } from "../../functions/api/admin/content.ts";
import {
  onRequestGet as getContentById,
  onRequestPatch as updateContent,
} from "../../functions/api/admin/content/[id].ts";
import { onRequestGet as getContentVersions } from "../../functions/api/admin/content/[id]/versions.ts";
import { onRequestPost as publishContent } from "../../functions/api/admin/content/[id]/publish.ts";
import { onRequestPost as unpublishContent } from "../../functions/api/admin/content/[id]/unpublish.ts";
import { GameType } from "../../shared/content.ts";

const payloads = {
  [GameType.QUIZ]: {
    prompt: "Quem construiu a arca segundo o relato bíblico?",
    choices: [
      { text: "Noé", correct: true },
      { text: "Moisés", correct: false },
      { text: "Davi", correct: false },
      { text: "Paulo", correct: false },
    ],
    book: "Gênesis", theme: "Dilúvio", explanation: "Noé obedeceu a Deus.",
  },
  [GameType.WORDLE]: { word: "GRACA", hint: "Favor imerecido" },
  [GameType.ASSOCIATION]: {
    title: "Personagens e acontecimentos",
    pairs: Array.from({ length: 4 }, (_, index) => ({ category: "Personagem", left: `Pessoa ${index}`, right: `Evento ${index}` })),
  },
  [GameType.TIMELINE]: {
    title: "Eventos bíblicos",
    events: Array.from({ length: 4 }, (_, index) => ({ title: `Evento ${index + 1}`, position: index + 1 })),
  },
  [GameType.MEMORY]: {
    title: "Símbolos bíblicos",
    pairs: Array.from({ length: 4 }, (_, index) => ({ title: `Par ${index + 1}`, icon: `Ícone ${index + 1}` })),
  },
  [GameType.WHO_AM_I]: {
    name: "Moisés",
    hints: ["Fui criado no Egito", "Vi uma sarça", "Conduzi o povo"],
    options: ["Moisés", "Davi", "Pedro", "Paulo"],
  },
  [GameType.THREE_CLUES]: { answer: "Belém", clues: ["Cidade", "Judá", "Nascimento de Jesus"] },
};

function universalBody(gameType = GameType.QUIZ, overrides = {}) {
  return {
    gameType,
    status: "DRAFT",
    templateId: "test-template",
    organizationId: "org-2",
    metadata: {
      id: "client-controlled-id",
      gameType,
      category: "Teste editorial",
      tags: ["bíblia", "teste"],
      difficulty: "MEDIUM",
      biblicalReference: "Gênesis 6",
      status: "DRAFT",
      authorId: "client-author",
      reviewerId: null,
      createdAt: 1,
      updatedAt: 1,
      version: 1,
      internalNotes: "Nota interna",
    },
    reference: { id: "gen-6", label: "Gênesis 6", type: "passage" },
    payload: structuredClone(payloads[gameType]),
    ...overrides,
  };
}

async function post(ctx, token, body) {
  return createContent({
    request: createAuthenticatedRequest("https://test/api/admin/content", { token, method: "POST", body }),
    env: ctx.env,
  });
}

async function transition(handler, ctx, token, contentId, version) {
  return handler({
    request: createAuthenticatedRequest(`https://test/api/admin/content/${contentId}`, {
      token,
      method: "POST",
      body: { version },
    }),
    env: ctx.env,
    params: { id: contentId },
  });
}

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

test("universal draft creation requires authentication and questions.edit", async t => {
  const { ctx, tokens } = await fixture(t);
  const anonymous = await createContent({
    request: new Request("https://test/api/admin/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(universalBody()),
    }),
    env: ctx.env,
  });
  assert.equal(anonymous.status, 401);
  assert.equal((await post(ctx, tokens.member, universalBody())).status, 403);
  assert.equal((await post(ctx, tokens.editor, universalBody())).status, 403);
});

test("server creates isolated DRAFT ids, version one and first history for all seven games", async t => {
  const { ctx, tokens } = await fixture(t);
  for (const gameType of Object.values(GameType)) {
    const response = await post(ctx, tokens.admin, universalBody(gameType));
    assert.equal(response.status, 201, gameType);
    const { content } = await responseJson(response);
    assert.notEqual(content.id, "client-controlled-id");
    assert.match(content.id, /^[0-9a-f-]{36}$/);
    assert.equal(content.organizationId, "org-1");
    assert.equal(content.authorId, "org-1-admin");
    assert.equal(content.status, "DRAFT");
    assert.equal(content.version, 1);
    assert.equal(content.gameType, gameType);
    assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions WHERE content_id=?").get(content.id).total, 1);
  }
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM question_bank").get().total, 0);
});

test("invalid game, non-DRAFT status and malformed payload are rejected server-side without writes", async t => {
  const { ctx, tokens } = await fixture(t);
  const invalidGame = await post(ctx, tokens.admin, universalBody(GameType.QUIZ, { gameType: "unknown-game" }));
  assert.equal(invalidGame.status, 422);
  assert.equal((await responseJson(invalidGame)).fields[0].code, "unsupported_game");
  const published = await post(ctx, tokens.admin, universalBody(GameType.QUIZ, { status: "PUBLISHED" }));
  assert.equal(published.status, 422);
  assert.equal((await responseJson(published)).fields[0].code, "draft_only");
  const invalidPayload = universalBody();
  invalidPayload.payload.choices = [];
  const invalid = await post(ctx, tokens.admin, invalidPayload);
  assert.equal(invalid.status, 422);
  assert.ok((await responseJson(invalid)).fields.some(field => field.field === "choices"));
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);
});

test("universal GET is tenant isolated and never treats a legacy Quiz id as universal", async t => {
  const { ctx, tokens } = await fixture(t);
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody()));
  const own = await getContentById({
    request: createAuthenticatedRequest(`https://test/api/admin/content/${content.id}`, { token: tokens.admin }),
    env: ctx.env,
    params: { id: content.id },
  });
  assert.equal(own.status, 200);
  const otherToken = await createSession(ctx, "org-2-admin");
  const horizontal = await getContentById({
    request: createAuthenticatedRequest(`https://test/api/admin/content/${content.id}`, { token: otherToken }),
    env: ctx.env,
    params: { id: content.id },
  });
  assert.equal(horizontal.status, 404);
  seedQuestion(ctx, { id: "legacy-only" });
  const legacy = await getContentById({
    request: createAuthenticatedRequest("https://test/api/admin/content/legacy-only", { token: tokens.admin }),
    env: ctx.env,
    params: { id: "legacy-only" },
  });
  assert.equal(legacy.status, 404);
});

test("valid update increments version and history while preserving identity and DRAFT status", async t => {
  const { ctx, tokens } = await fixture(t);
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody(GameType.WORDLE)));
  const body = universalBody(GameType.WORDLE, {
    version: 1,
    status: "DRAFT",
    payload: { word: "PAULO", hint: "Apóstolo" },
  });
  body.metadata.version = 1;
  body.metadata.authorId = "attacker";
  const response = await updateContent({
    request: createAuthenticatedRequest(`https://test/api/admin/content/${content.id}`, {
      token: tokens.admin, method: "PATCH", body,
    }),
    env: ctx.env,
    params: { id: content.id },
  });
  assert.equal(response.status, 200);
  const updated = (await responseJson(response)).content;
  assert.equal(updated.version, 2);
  assert.equal(updated.authorId, "org-1-admin");
  assert.equal(updated.status, "DRAFT");
  assert.equal(updated.payload.word, "PAULO");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions WHERE content_id=?").get(content.id).total, 2);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM question_bank").get().total, 0);
});

test("optimistic conflict returns current version and preserves persisted data", async t => {
  const { ctx, tokens } = await fixture(t);
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody(GameType.WORDLE)));
  const first = universalBody(GameType.WORDLE, { version: 1, payload: { word: "PEDRO", hint: "Discípulo" } });
  first.metadata.version = 1;
  assert.equal((await updateContent({
    request: createAuthenticatedRequest(`https://test/api/admin/content/${content.id}`, { token: tokens.admin, method: "PATCH", body: first }),
    env: ctx.env,
    params: { id: content.id },
  })).status, 200);
  const stale = universalBody(GameType.WORDLE, { version: 1, payload: { word: "JUDAS", hint: "Não salvar" } });
  stale.metadata.version = 1;
  const conflict = await updateContent({
    request: createAuthenticatedRequest(`https://test/api/admin/content/${content.id}`, { token: tokens.admin, method: "PATCH", body: stale }),
    env: ctx.env,
    params: { id: content.id },
  });
  assert.equal(conflict.status, 409);
  assert.equal((await responseJson(conflict)).currentVersion, 2);
  assert.equal(JSON.parse(ctx.raw.prepare("SELECT payload_json FROM content_items WHERE id=?").get(content.id).payload_json).word, "PEDRO");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions WHERE content_id=?").get(content.id).total, 2);
});

test("version endpoint returns sanitized history for owned universal content", async t => {
  const { ctx, tokens } = await fixture(t);
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody()));
  const response = await getContentVersions({
    request: createAuthenticatedRequest(`https://test/api/admin/content/${content.id}/versions`, { token: tokens.admin }),
    env: ctx.env,
    params: { id: content.id },
  });
  assert.equal(response.status, 200);
  const data = await responseJson(response);
  assert.deepEqual(data.versions.map(version => version.version), [1]);
  assert.equal("payloadJson" in data.versions[0], false);
});

test("combined archive paginates both sources deterministically and filters source, game, status, difficulty and text", async t => {
  const { ctx, tokens } = await fixture(t);
  for (let index = 0; index < 11; index++) seedQuestion(ctx, { id: `legacy-${index}`, updatedAt: 100 + index });
  for (let index = 0; index < 4; index++) {
    const body = universalBody(index % 2 ? GameType.WORDLE : GameType.QUIZ);
    body.metadata.category = index === 3 ? "Profetas" : "Teste editorial";
    body.metadata.difficulty = index === 3 ? "HARD" : "MEDIUM";
    if (index === 3) body.payload = { word: "ELIAS", hint: "Profeta do Carmelo" };
    await post(ctx, tokens.admin, body);
  }
  const request = query => getContent({
    request: createAuthenticatedRequest(`https://test/api/admin/content?${query}`, { token: tokens.admin }),
    env: ctx.env,
  });
  const page1 = await responseJson(await request("page=1&pageSize=10"));
  const page2 = await responseJson(await request("page=2&pageSize=10"));
  assert.equal(page1.pagination.total, 15);
  assert.equal(page1.items.length, 10);
  assert.equal(page2.items.length, 5);
  assert.ok(page1.items.some(item => item.source === "UNIVERSAL_CMS"));
  assert.ok([...page1.items, ...page2.items].some(item => item.source === "LEGACY_QUIZ"));
  const cms = await responseJson(await request("source=UNIVERSAL_CMS&status=DRAFT"));
  assert.equal(cms.items.length, 4);
  assert.ok(cms.items.every(item => item.source === "UNIVERSAL_CMS"));
  const filtered = await responseJson(await request("source=UNIVERSAL_CMS&game=wordle-biblico&difficulty=HARD&q=Carmelo"));
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0].title, "ELIAS");
});

test("dashboard combines sources without duplicating legacy questions", async t => {
  const { ctx, tokens } = await fixture(t);
  seedQuestion(ctx, { id: "legacy" });
  await post(ctx, tokens.admin, universalBody(GameType.QUIZ));
  await post(ctx, tokens.admin, universalBody(GameType.MEMORY));
  const data = await responseJson(await getContent({
    request: createAuthenticatedRequest("https://test/api/admin/content?view=dashboard", { token: tokens.admin }),
    env: ctx.env,
  }));
  assert.equal(data.total, 3);
  assert.equal(data.byStatus.DRAFT, 2);
  assert.equal(data.byGame.find(game => game.gameType === GameType.QUIZ).count, 2);
  assert.equal(data.byGame.find(game => game.gameType === GameType.MEMORY).count, 1);
});

test("valid publication increments version, records history and audit, and locks direct editing", async t => {
  const { ctx, tokens } = await fixture(t);
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody(GameType.QUIZ)));
  const response = await transition(publishContent, ctx, tokens.admin, content.id, 1);
  assert.equal(response.status, 200);
  const published = (await responseJson(response)).content;
  assert.equal(published.status, "PUBLISHED");
  assert.equal(published.version, 2);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions WHERE content_id=?").get(content.id).total, 2);
  const audit = ctx.raw.prepare("SELECT action,details_json FROM audit_logs WHERE entity_id=? ORDER BY created_at DESC").get(content.id);
  assert.equal(audit.action, "content.published");
  assert.deepEqual(JSON.parse(audit.details_json), {
    fromStatus: "DRAFT",
    toStatus: "PUBLISHED",
    version: 2,
  });
  assert.equal(audit.details_json.includes("Quem construiu"), false);

  const edit = universalBody(GameType.QUIZ, { version: 2 });
  edit.metadata.version = 2;
  const locked = await updateContent({
    request: createAuthenticatedRequest(`https://test/api/admin/content/${content.id}`, {
      token: tokens.admin, method: "PATCH", body: edit,
    }),
    env: ctx.env,
    params: { id: content.id },
  });
  assert.equal(locked.status, 409);
  assert.equal((await responseJson(locked)).error, "content_not_draft");
});

test("publication revalidates persisted content and preserves an invalid draft without partial writes", async t => {
  const { ctx, tokens } = await fixture(t);
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody(GameType.QUIZ)));
  ctx.raw.prepare("UPDATE content_items SET payload_json=? WHERE id=?")
    .run(JSON.stringify({ prompt: "", choices: [] }), content.id);
  const response = await transition(publishContent, ctx, tokens.admin, content.id, 1);
  assert.equal(response.status, 422);
  const data = await responseJson(response);
  assert.equal(data.error, "invalid_content");
  assert.ok(data.fields.length > 0);
  const stored = ctx.raw.prepare("SELECT status,version FROM content_items WHERE id=?").get(content.id);
  assert.equal(stored.status, "DRAFT");
  assert.equal(stored.version, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions WHERE content_id=?").get(content.id).total, 1);
});

test("publication requires questions.edit and hides cross-organization existence", async t => {
  const { ctx, tokens } = await fixture(t);
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody()));
  assert.equal((await transition(publishContent, ctx, tokens.member, content.id, 1)).status, 403);
  const otherToken = await createSession(ctx, "org-2-admin");
  assert.equal((await transition(publishContent, ctx, otherToken, content.id, 1)).status, 404);
  const stored = ctx.raw.prepare("SELECT status,version FROM content_items WHERE id=?").get(content.id);
  assert.equal(stored.status, "DRAFT");
  assert.equal(stored.version, 1);
});

test("return to Draft preserves history and writes a sanitized audit event", async t => {
  const { ctx, tokens } = await fixture(t);
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody(GameType.WORDLE)));
  const published = (await responseJson(
    await transition(publishContent, ctx, tokens.admin, content.id, 1),
  )).content;
  const response = await transition(unpublishContent, ctx, tokens.admin, content.id, published.version);
  assert.equal(response.status, 200);
  const draft = (await responseJson(response)).content;
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.version, 3);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions WHERE content_id=?").get(content.id).total, 3);
  const audit = ctx.raw.prepare("SELECT action,details_json FROM audit_logs WHERE entity_id=? ORDER BY created_at DESC").get(content.id);
  assert.equal(audit.action, "content.returned_to_draft");
  assert.equal(audit.details_json.includes("GRACA"), false);
});

test("published universal content is reflected once in archive filters and dashboard totals", async t => {
  const { ctx, tokens } = await fixture(t);
  seedQuestion(ctx, { id: "legacy-published" });
  const { content } = await responseJson(await post(ctx, tokens.admin, universalBody(GameType.MEMORY)));
  await transition(publishContent, ctx, tokens.admin, content.id, 1);
  const archive = await responseJson(await getContent({
    request: createAuthenticatedRequest(
      "https://test/api/admin/content?source=UNIVERSAL_CMS&status=PUBLISHED",
      { token: tokens.admin },
    ),
    env: ctx.env,
  }));
  assert.equal(archive.pagination.total, 1);
  assert.equal(archive.items[0].id, content.id);
  assert.equal(archive.items[0].status, "PUBLISHED");
  const dashboard = await responseJson(await getContent({
    request: createAuthenticatedRequest("https://test/api/admin/content?view=dashboard", {
      token: tokens.admin,
    }),
    env: ctx.env,
  }));
  assert.equal(dashboard.total, 2);
  assert.equal(dashboard.byStatus.PUBLISHED, 2);
  assert.equal(dashboard.byStatus.DRAFT, 0);
});

test("failed atomic create leaves neither item nor version", async t => {
  const { ctx, tokens } = await fixture(t);
  const realBatch = ctx.env.DB.batch.bind(ctx.env.DB);
  ctx.env.DB.batch = async () => { throw new Error("simulated_batch_failure"); };
  const response = await post(ctx, tokens.admin, universalBody());
  ctx.env.DB.batch = realBatch;
  assert.equal(response.status, 500);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions").get().total, 0);
});
