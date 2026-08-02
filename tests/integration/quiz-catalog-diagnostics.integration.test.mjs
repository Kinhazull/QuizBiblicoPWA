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
import { loadQuizGenerationDiagnostics } from "../../functions/_lib/quiz-generation-diagnostics.ts";
import { dailySelectionKey, organizationDayKey } from "../../functions/_lib/platform-daily-objectives.ts";
import { GameType } from "../../shared/content.ts";
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
  historical = true,
} = {}) {
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,payload_json,
    version,author_id,created_at,updated_at,source
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'UNIVERSAL_CMS')`).run(
    id, organizationId, "quiz-biblico", status, "Evangelhos", difficulty, "João 3:16", "[]",
    JSON.stringify(payload), version, organizationId === "org-1" ? "admin-1" : "admin-2", 1, 1,
  );
  if (historical) ctx.raw.prepare(`INSERT INTO content_versions(
    id,content_id,organization_id,version,metadata_json,payload_json,changed_by,created_at
  ) VALUES(?,?,?,?,?,?,?,1)`).run(
    `version-${id}-${version}`, id, organizationId, version,
    JSON.stringify({
      id, gameType: "quiz-biblico", category: "Evangelhos", tags: [], difficulty,
      biblicalReference: "JoÃ£o 3:16", status, authorId: organizationId === "org-1" ? "admin-1" : "admin-2",
      reviewerId: null, createdAt: 1, updatedAt: 1, version, internalNotes: null,
    }), JSON.stringify(payload), organizationId === "org-1" ? "admin-1" : "admin-2",
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

test("D1 parameter cap is respected and generation diagnostics complete with 120 candidates", async t => {
  const ctx = fixture(t);
  for (let index = 0; index < 120; index += 1) {
    insertQuiz(ctx, { id: `d1-limit-${index}`, difficulty: index % 5 === 0 ? "HARD" : "MEDIUM" });
  }
  const limitedDb = new Proxy(ctx.env.DB, {
    get(target, property) {
      if (property === "prepare") return sql => {
        const prepared = target.prepare(sql);
        return new Proxy(prepared, {
          get(statement, method) {
            if (method === "bind") return (...values) => {
              if (values.length > 100) throw new Error("too many SQL variables at offset 0");
              return statement.bind(...values);
            };
            const value = statement[method];
            return typeof value === "function" ? value.bind(statement) : value;
          },
        });
      };
      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const token = await createSession(ctx, "editor-1");
  const response = await onRequestGet({
    request: createAuthenticatedRequest("https://test/api/admin/content/quiz-catalog-diagnostics", { token }),
    env: { ...ctx.env, DB: limitedDb },
  });
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.cms.published, 120);
  assert.equal(data.eligibleCatalog.total, 120);
  assert.equal(data.generation.status, "OK");
  assert.equal(data.generation.stages.eligible_catalog_read.status, "OK");
  assert.equal(data.generation.freePlay.success, true);
  assert.equal(JSON.stringify(data).includes("Correta"), false);
  assert.equal(JSON.stringify(data).includes("SELECT "), false);
});

test("a controlled generation failure remains isolated from the basic catalog diagnosis", async t => {
  const ctx = fixture(t);
  insertQuiz(ctx, { id: "isolated-generation-error" });
  const failingDb = new Proxy(ctx.env.DB, {
    get(target, property) {
      if (property === "prepare") return sql => {
        if (/\bgenerated_game_selections\b/i.test(sql)) {
          throw new Error("simulated diagnostic read failure");
        }
        return target.prepare(sql);
      };
      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const token = await createSession(ctx, "editor-1");
  const response = await onRequestGet({
    request: createAuthenticatedRequest("https://test/api/admin/content/quiz-catalog-diagnostics", { token }),
    env: { ...ctx.env, DB: failingDb },
  });
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.cms.published, 1);
  assert.equal(data.eligibleCatalog.total, 1);
  assert.equal(data.generation.status, "ERROR");
  assert.equal(data.generation.stage, "selection_read");
  assert.equal(data.generation.code, "generation_diagnostic_step_failed");
  assert.equal(JSON.stringify(data).includes("simulated diagnostic"), false);
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

test("diagnostic service prepares SELECT statements only, including generation simulation", async t => {
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
  await loadQuizCatalogDiagnostics({ ...ctx.env, DB: db }, "org-1", "editor-1");
  assert.ok(statements.length > 2);
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

test("generation diagnostic succeeds in memory for Free Play and Daily with historical content", async t => {
  const ctx = fixture(t);
  ["EASY", "EASY", "MEDIUM", "MEDIUM", "HARD"].forEach((difficulty, index) =>
    insertQuiz(ctx, { id: `generation-${index}`, difficulty }));
  const result = await loadQuizGenerationDiagnostics(ctx.env, { organizationId: "org-1", userId: "editor-1" }, Date.UTC(2026, 7, 1, 12));
  assert.equal(result.status, "OK");
  assert.equal(result.freePlay.success, true);
  assert.equal(result.freePlay.canSelectFive, true);
  assert.equal(result.freePlay.historicalResolution.safePayloadCreatable, true);
  assert.equal(result.daily.success, true);
  assert.deepEqual(result.daily.finalDistribution, { EASY: 2, MEDIUM: 2, HARD: 1 });
  assert.equal(JSON.stringify(result).includes("Correta"), false);
});

test("generation diagnostic detects selection identity, partial selection and missing history", async t => {
  const ctx = fixture(t);
  ["EASY", "EASY", "MEDIUM", "MEDIUM", "HARD"].forEach((difficulty, index) =>
    insertQuiz(ctx, { id: `integrity-${index}`, difficulty, historical: index !== 4 }));
  const now = Date.UTC(2026, 7, 1, 12);
  const dayKey = organizationDayKey(now, "America/Sao_Paulo");
  const key = dailySelectionKey(dayKey, GameType.QUIZ);
  ctx.raw.prepare(`INSERT INTO generated_game_selections(
    id,organization_id,game_type,mode,selection_key,algorithm_version,seed_hash,request_fingerprint,
    status,filters_json,created_at,expires_at
  ) VALUES('daily-broken','org-1','quiz-biblico','DAILY',?,1,'wrong','wrong','ACTIVE','{"count":5}',1,?)`)
    .run(key, now + 86_400_000);
  ctx.raw.prepare(`INSERT INTO generated_game_selection_items(
    selection_id,organization_id,content_id,content_version,position,audit_metadata_json,created_at
  ) VALUES('daily-broken','org-1','integrity-0',1,1,'{}',1)`).run();
  const result = await loadQuizGenerationDiagnostics(ctx.env, { organizationId: "org-1", userId: "editor-1" }, now);
  assert.equal(result.daily.fingerprintConflict, true);
  assert.equal(result.daily.partial, true);
  assert.equal(result.persistence.incompleteSelections, 1);
  assert.equal(result.persistence.missingHistoricalVersions, 0);
  assert.equal(result.freePlay.technicalCode, "historical_content_unavailable");
});

test("generation diagnostic reports repetition exclusions and conflicting participation without blocking a new key", async t => {
  const ctx = fixture(t);
  ["EASY", "EASY", "MEDIUM", "MEDIUM", "HARD", "MEDIUM"].forEach((difficulty, index) =>
    insertQuiz(ctx, { id: `repeat-${index}`, difficulty }));
  ctx.raw.prepare(`INSERT INTO generated_game_selections(
    id,organization_id,requested_by_user_id,game_type,mode,selection_key,algorithm_version,seed_hash,
    request_fingerprint,status,filters_json,created_at
  ) VALUES('repeat-selection','org-1','editor-1','quiz-biblico','DAILY','old-daily',1,'seed','fingerprint','ACTIVE','{"count":1}',1)`).run();
  ctx.raw.prepare(`INSERT INTO generated_game_selection_items(
    selection_id,organization_id,content_id,content_version,position,audit_metadata_json,created_at
  ) VALUES('repeat-selection','org-1','repeat-0',1,1,'{}',1)`).run();
  ctx.raw.prepare(`INSERT INTO generated_game_participations(
    id,selection_id,organization_id,user_id,game_type,mode,status,created_at,updated_at
  ) VALUES('repeat-participation','repeat-selection','org-1','editor-1','quiz-biblico','FREE_PLAY','STARTED',1,1)`).run();
  ctx.raw.prepare(`INSERT INTO generated_game_participation_usage(
    participation_id,organization_id,content_id,content_version,recorded_at
  ) VALUES('repeat-participation','org-1','repeat-0',1,1)`).run();
  const result = await loadQuizGenerationDiagnostics(ctx.env, { organizationId: "org-1", userId: "editor-1" });
  assert.equal(result.freePlay.repetitionExclusions, 1);
  assert.equal(result.freePlay.candidatesAfterExclusions, 5);
  assert.equal(result.participations.conflicting, 1);
  assert.equal(result.participations.blocksNewSelection, false);
});
