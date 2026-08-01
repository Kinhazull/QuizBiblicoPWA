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
import {
  loadLegacyQuizImportCandidates,
  migrateLegacyQuizArchive,
} from "../../functions/_lib/universal-content-importer.ts";
import { listEligibleUniversalContent } from "../../functions/_lib/universal-eligible-content-catalog.ts";
import { generateFreePlaySelection } from "../../functions/_lib/platform-free-play.ts";
import { getDailyObjective } from "../../functions/_lib/platform-daily-objectives.ts";
import { GameType } from "../../shared/content.ts";
import { onRequestPost as migrateEndpoint } from "../../functions/api/admin/content/migrate-legacy-quiz.ts";
import { onRequestPost as generateFreePlayEndpoint } from "../../functions/api/platform/free-play/generate.ts";

function seedLegacyQuestion(ctx, index, options = {}) {
  const id = options.id ?? `legacy-question-${index}`;
  const status = options.status ?? "active";
  const reviewStatus = options.reviewStatus ?? "approved";
  const reference = options.reference === undefined ? `João ${index + 1}:1` : options.reference;
  ctx.raw.prepare(`INSERT INTO question_bank(
    id,organization_id,reference,book,theme,category,difficulty,prompt,normalized_prompt,
    commentary,status,times_used,created_by,created_at,updated_at,review_status,version,updated_by
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, "org-1", reference, "João", "Vida de Jesus", "Evangelhos", options.difficulty ?? "medium",
    `Pergunta histórica ${index}: quem realizou este feito?`, `pergunta historica ${index}`,
    `Comentário preservado ${index}`, status, index, "admin-1", 1000 + index,
    2000 + index, reviewStatus, 2, "admin-1",
  );
  const choiceCount = options.choiceCount ?? 4;
  for (let position = 0; position < choiceCount; position += 1) {
    ctx.raw.prepare(`INSERT INTO question_bank_choices(
      id,question_id,position,text,correct
    ) VALUES(?,?,?,?,?)`).run(
      `${id}-choice-${position}`, id, position, `Alternativa ${index}-${position}`, position === 0 ? 1 : 0,
    );
  }
  return id;
}

function setup(t) {
  const ctx = createTestDatabase();
  t.after(() => ctx.close());
  seedOrganization(ctx);
  seedUser(ctx, { id: "admin-1", role: "admin" });
  seedUser(ctx, { id: "player-1" });
  return ctx;
}

test("legacy Quiz archive is migrated without loss and only valid content becomes eligible", async t => {
  const ctx = setup(t);
  for (let index = 0; index < 10; index += 1) {
    const difficulty = index < 2 ? "easy" : index === 9 ? "hard" : "medium";
    seedLegacyQuestion(ctx, index, { difficulty });
  }
  seedLegacyQuestion(ctx, 10, { reference: null });
  seedLegacyQuestion(ctx, 11, { status: "archived" });
  seedLegacyQuestion(ctx, 12, { choiceCount: 3 });

  const preview = await migrateLegacyQuizArchive(ctx.env, "org-1", "admin-1", false);
  assert.equal(preview.report.received, 13);
  assert.equal(preview.report.invalid, 2);
  assert.equal(preview.report.archived, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);

  const applied = await migrateLegacyQuizArchive(ctx.env, "org-1", "admin-1", true);
  assert.equal(applied.report.migrated, 13);
  assert.equal(applied.report.discarded, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 13);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions").get().total, 13);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM universal_content_library").get().total, 10);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM question_bank").get().total, 13);

  const historical = ctx.raw.prepare("SELECT * FROM content_items WHERE id='legacy-question-0'").get();
  const payload = JSON.parse(historical.payload_json);
  assert.equal(historical.version, 2);
  assert.equal(payload.prompt, "Pergunta histórica 0: quem realizou este feito?");
  assert.equal(payload.explanation, "Comentário preservado 0");
  assert.deepEqual(payload.choices.map(choice => choice.text), [
    "Alternativa 0-0", "Alternativa 0-1", "Alternativa 0-2", "Alternativa 0-3",
  ]);
  const eligible = await listEligibleUniversalContent(ctx.env, {
    organizationId: "org-1", gameType: GameType.QUIZ, limit: 20,
  });
  assert.equal(eligible.length, 10);
  assert.ok(eligible.every(item => item.themes.includes("Vida de Jesus")));
  assert.ok(eligible.every(item => item.books.includes("João")));

  const identity = { organizationId: "org-1", userId: "player-1" };
  const freePlay = await generateFreePlaySelection(ctx.env, identity, {
    gameType: GameType.QUIZ,
    idempotencyKey: "migrated-quiz-free-play-0001",
    filters: { count: 5 },
  }, Date.UTC(2026, 7, 1, 12));
  const daily = await getDailyObjective(ctx.env, identity, GameType.QUIZ, Date.UTC(2026, 7, 1, 12));
  assert.equal(freePlay.gameType, GameType.QUIZ);
  assert.equal(daily.gameType, GameType.QUIZ);
  assert.equal(JSON.stringify(daily.content).includes("correct"), false);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM rounds").get().total, 0);
});

test("migration is resumable and idempotent", async t => {
  const ctx = setup(t);
  seedLegacyQuestion(ctx, 1);
  const candidates = await loadLegacyQuizImportCandidates(ctx.env, "org-1");
  assert.equal(candidates[0].model.id, "legacy-question-1");

  const first = await migrateLegacyQuizArchive(ctx.env, "org-1", "admin-1", true);
  const second = await migrateLegacyQuizArchive(ctx.env, "org-1", "admin-1", true);
  assert.equal(first.report.migrated, 1);
  assert.equal(second.report.migrated, 0);
  assert.equal(second.report.alreadyMigrated, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM audit_logs WHERE action='content.legacy_quiz_migrated'").get().total, 1);
});

test("a failed batch can be resumed without duplicating the completed batch", async t => {
  const ctx = setup(t);
  for (let index = 0; index < 30; index += 1) seedLegacyQuestion(ctx, index);
  const originalBatch = ctx.env.DB.batch.bind(ctx.env.DB);
  let calls = 0;
  ctx.env.DB.batch = async statements => {
    calls += 1;
    if (calls >= 2) throw new Error("simulated_batch_failure");
    return originalBatch(statements);
  };
  await assert.rejects(
    migrateLegacyQuizArchive(ctx.env, "org-1", "admin-1", true),
    /simulated_batch_failure/,
  );
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 25);
  ctx.env.DB.batch = originalBatch;

  const resumed = await migrateLegacyQuizArchive(ctx.env, "org-1", "admin-1", true);
  assert.equal(resumed.report.alreadyMigrated, 25);
  assert.equal(resumed.report.migrated, 5);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 30);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions").get().total, 30);
});

test("players receive a read-only legacy bridge before import without creating CMS content", async t => {
  const ctx = setup(t);
  for (let index = 0; index < 10; index += 1) {
    seedLegacyQuestion(ctx, index, { difficulty: index < 2 ? "easy" : index === 9 ? "hard" : "medium" });
  }
  const identity = { organizationId: "org-1", userId: "player-1" };
  const token = await createSession(ctx, identity.userId);
  const call = index => generateFreePlayEndpoint({
    request: createAuthenticatedRequest("https://test/api/platform/free-play/generate", {
      token,
      method: "POST",
      body: {
        gameType: GameType.QUIZ,
        idempotencyKey: `rollout-before-import-${String(index).padStart(4, "0")}`,
        filters: {},
      },
    }),
    env: ctx.env,
  });
  const responses = await Promise.all([call(1), call(2)]);
  for (const response of responses) {
    const data = await responseJson(response);
    assert.equal(response.status, 200);
    assert.equal(data.game.playHref, "/jogar?legacy=1");
    assert.equal(data.game.mode, "LEGACY_READ_ONLY");
  }
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM universal_content_library").get().total, 0);
  ctx.env.QUIZ_LEGACY_FALLBACK_ENABLED = "false";
  const disabled = await call(3);
  assert.equal(disabled.status, 400);
  assert.equal((await responseJson(disabled)).error, "insufficient_eligible_content");
});

test("after the confirmed import Free Play and Daily use only Universal selections", async t => {
  const ctx = setup(t);
  for (let index = 0; index < 10; index += 1) {
    seedLegacyQuestion(ctx, index, { difficulty: index < 2 ? "easy" : index === 9 ? "hard" : "medium" });
  }
  const identity = { organizationId: "org-1", userId: "player-1" };
  await migrateLegacyQuizArchive(ctx.env, "org-1", "admin-1", true);
  const afterImport = await generateFreePlaySelection(ctx.env, identity, {
    gameType: GameType.QUIZ,
    idempotencyKey: "rollout-after-import-0002",
    filters: { count: 5 },
  }, Date.UTC(2026, 7, 2, 13));
  const daily = await getDailyObjective(ctx.env, identity, GameType.QUIZ, Date.UTC(2026, 7, 3, 12));
  assert.equal(afterImport.gameType, GameType.QUIZ);
  assert.equal(daily.gameType, GameType.QUIZ);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selection_items item LEFT JOIN content_items content ON content.id=item.content_id WHERE content.id IS NULL").get().total, 0);
});

test("a one-thousand-question archive migrates completely without loss", async t => {
  const ctx = setup(t);
  for (let index = 0; index < 1_000; index += 1) seedLegacyQuestion(ctx, index);

  const result = await migrateLegacyQuizArchive(ctx.env, "org-1", "admin-1", true);
  assert.equal(result.report.received, 1_000);
  assert.equal(result.report.migrated, 1_000);
  assert.equal(result.report.invalid, 0);
  assert.equal(result.report.discarded, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 1_000);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions").get().total, 1_000);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM universal_content_library").get().total, 1_000);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM question_bank").get().total, 1_000);
});

test("the administrative migration endpoint is permissioned, dry-run by default and explicitly confirmed", async t => {
  const ctx = setup(t);
  seedLegacyQuestion(ctx, 1);
  const adminToken = await createSession(ctx, "admin-1");
  const playerToken = await createSession(ctx, "player-1");
  const call = (token, body) => migrateEndpoint({
    request: createAuthenticatedRequest("https://test/api/admin/content/migrate-legacy-quiz", {
      token,
      method: "POST",
      body,
    }),
    env: ctx.env,
  });

  assert.equal((await call(playerToken, {})).status, 403);
  const preview = await responseJson(await call(adminToken, {}));
  assert.equal(preview.dryRun, true);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);
  assert.equal((await call(adminToken, { commit: true })).status, 400);
  const applied = await responseJson(await call(adminToken, {
    commit: true,
    confirmation: "MIGRAR_ACERVO_QUIZ_PARA_CMS",
  }));
  assert.equal(applied.dryRun, false);
  assert.equal(applied.report.migrated, 1);
});
