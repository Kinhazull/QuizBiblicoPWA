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
import { loadQuizCatalogDiagnostics } from "../../functions/_lib/quiz-catalog-diagnostics.ts";
import { onRequestGet } from "../../functions/api/admin/content/quiz-catalog-diagnostics.ts";

function fixture(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "admin-1", role: "admin" });
  seedUser(ctx, { id: "editor-1" });
  seedUser(ctx, { id: "player-1" });
  seedUser(ctx, { id: "admin-2", organizationId: "org-2", role: "admin" });
  ctx.raw.prepare("INSERT INTO user_permissions(user_id,permission_code,granted_by,granted_at) VALUES(?,?,?,0)")
    .run("editor-1", "questions.edit", "admin-1");
  return ctx;
}

function quizPayload(index, overrides = {}) {
  return {
    prompt: `Pergunta bíblica válida número ${index}, qual é a resposta?`,
    choices: [
      { text: `Correta ${index}`, correct: true },
      { text: `Alternativa B ${index}`, correct: false },
      { text: `Alternativa C ${index}`, correct: false },
      { text: `Alternativa D ${index}`, correct: false },
    ],
    book: "João", theme: "Vida de Jesus", explanation: null,
    ...overrides,
  };
}

function insertQuiz(ctx, {
  id, organizationId = "org-1", status = "PUBLISHED", difficulty = "MEDIUM",
  version = 1, payload = quizPayload(id), library = true,
  libraryGameType = "quiz-biblico", libraryVersion = version, availability = "AVAILABLE",
  priority = 0, firstPublishedAt = Number(String(id).replace(/\D/g, "")) || 1,
} = {}) {
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,payload_json,
    version,author_id,created_at,updated_at,source
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'UNIVERSAL_CMS')`).run(
    id, organizationId, "quiz-biblico", status, "Evangelhos", difficulty, "João 3:16", "[]",
    JSON.stringify(payload), version, organizationId === "org-1" ? "admin-1" : "admin-2", 1, 1,
  );
  if (library) ctx.raw.prepare(`INSERT INTO universal_content_library(
    organization_id,content_id,game_type,content_version,difficulty,themes_json,books_json,tags_json,
    priority,usage_count,first_published_at,availability_status,created_at,updated_at
  ) VALUES(?,?,?,?,?,'[]','[]','[]',?,0,?,?,1,1)`).run(
    organizationId, id, libraryGameType, libraryVersion, difficulty, priority, firstPublishedAt, availability,
  );
}

test("endpoint requires authentication and questions.edit while isolating the session organization", async t => {
  const ctx = fixture(t);
  insertQuiz(ctx, { id: "org-1-quiz" });
  insertQuiz(ctx, { id: "org-2-quiz", organizationId: "org-2" });
  const editorToken = await createSession(ctx, "editor-1");
  const playerToken = await createSession(ctx, "player-1");
  const call = token => onRequestGet({
    request: token
      ? createAuthenticatedRequest("https://test/api/admin/content/quiz-catalog-diagnostics", { token })
      : new Request("https://test/api/admin/content/quiz-catalog-diagnostics"),
    env: ctx.env,
  });
  assert.equal((await call()).status, 401);
  assert.equal((await call(playerToken)).status, 403);
  const response = await call(editorToken);
  const data = await responseJson(response);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  assert.equal(data.cms.published, 1);
  assert.equal(data.eligibleCatalog.total, 1);
});

test("diagnoses missing, unavailable, mismatched and invalid records without writing", async t => {
  const ctx = fixture(t);
  insertQuiz(ctx, { id: "missing", library: false });
  insertQuiz(ctx, { id: "unavailable", availability: "RESERVED_EVENT" });
  insertQuiz(ctx, { id: "wrong-game", libraryGameType: "wordle-biblico" });
  insertQuiz(ctx, { id: "wrong-version", libraryVersion: 2 });
  insertQuiz(ctx, { id: "draft", status: "DRAFT", availability: "ARCHIVED" });
  insertQuiz(ctx, { id: "invalid", payload: quizPayload("invalid", { choices: [] }) });
  const before = ctx.raw.prepare("SELECT COUNT(*) total FROM audit_logs").get().total;
  const result = await loadQuizCatalogDiagnostics(ctx.env, "org-1");
  assert.equal(result.exclusions.reasons.missing_library_projection, 1);
  assert.equal(result.exclusions.reasons.unavailable_library_status, 1);
  assert.equal(result.exclusions.reasons.game_type_mismatch, 1);
  assert.equal(result.exclusions.reasons.version_mismatch, 1);
  assert.equal(result.exclusions.reasons.cms_not_published, 1);
  assert.equal(result.exclusions.reasons.insufficient_choices, 1);
  assert.equal(result.eligibleCatalog.total, 0);
  assert.ok(result.exclusions.examples.length <= 10);
  assert.equal(JSON.stringify(result).includes("Correta"), false);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM audit_logs").get().total, before);
});

test("distinguishes an empty library from a populated but unavailable library", async t => {
  const empty = fixture(t);
  insertQuiz(empty, { id: "without-projection", library: false });
  const emptyResult = await loadQuizCatalogDiagnostics(empty.env, "org-1");
  assert.equal(emptyResult.conclusion, "library_not_populated");

  const unavailable = fixture(t);
  insertQuiz(unavailable, { id: "reserved", availability: "RESERVED_DAILY" });
  const unavailableResult = await loadQuizCatalogDiagnostics(unavailable.env, "org-1");
  assert.equal(unavailableResult.conclusion, "library_not_available");
});

test("diagnostic service prepares SELECT statements only", async t => {
  const ctx = fixture(t);
  insertQuiz(ctx, { id: "read-only" });
  const statements = [];
  const db = new Proxy(ctx.env.DB, {
    get(target, property) {
      if (property === "prepare") return sql => {
        statements.push(sql);
        assert.match(sql.trim(), /^SELECT\b/i);
        return target.prepare(sql);
      };
      if (["batch", "exec"].includes(String(property))) {
        return () => { throw new Error(`write method ${String(property)} must not be called`); };
      }
      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  await loadQuizCatalogDiagnostics({ ...ctx.env, DB: db }, "org-1");
  assert.equal(statements.length, 2);
});

test("reports a fully eligible catalog and its daily difficulty distribution", async t => {
  const ctx = fixture(t);
  ["EASY", "EASY", "MEDIUM", "MEDIUM", "HARD"].forEach((difficulty, index) =>
    insertQuiz(ctx, { id: `eligible-${index}`, difficulty }));
  const result = await loadQuizCatalogDiagnostics(ctx.env, "org-1");
  assert.equal(result.cms.published, 5);
  assert.equal(result.library.total, 5);
  assert.equal(result.crossCheck.publishedAvailable, 5);
  assert.equal(result.eligibleCatalog.total, 5);
  assert.deepEqual(result.eligibleCatalog.byDifficulty, { EASY: 2, MEDIUM: 2, HARD: 1 });
  assert.equal(result.generatorWindow.satisfiesDailyDistribution, true);
  assert.equal(result.generatorWindow.completeCatalogSatisfiesDailyDistribution, true);
  assert.equal(result.conclusion, "eligible_catalog_generator_failure");
});

test("detects when the real first-200 window alone cannot satisfy the daily profile", async t => {
  const ctx = fixture(t);
  for (let index = 0; index < 200; index += 1) {
    insertQuiz(ctx, { id: `medium-${String(index).padStart(3, "0")}`, difficulty: "MEDIUM", firstPublishedAt: index + 1 });
  }
  insertQuiz(ctx, { id: "late-easy-1", difficulty: "EASY", firstPublishedAt: 1001 });
  insertQuiz(ctx, { id: "late-easy-2", difficulty: "EASY", firstPublishedAt: 1002 });
  insertQuiz(ctx, { id: "late-hard", difficulty: "HARD", firstPublishedAt: 1003 });
  const result = await loadQuizCatalogDiagnostics(ctx.env, "org-1");
  assert.equal(result.eligibleCatalog.total, 203);
  assert.equal(result.generatorWindow.libraryCandidates, 200);
  assert.equal(result.generatorWindow.satisfiesDailyDistribution, false);
  assert.equal(result.generatorWindow.completeCatalogSatisfiesDailyDistribution, true);
  assert.equal(result.conclusion, "first_200_affects_daily_only");
});
