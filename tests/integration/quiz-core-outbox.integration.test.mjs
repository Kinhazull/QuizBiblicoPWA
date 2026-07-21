import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthenticatedRequest,
  createSession,
  createTestDatabase,
  createValidRound,
  responseJson,
  seedOrganization,
  seedUser,
  withFrozenTime,
} from "../helpers/integration.mjs";
import { onRequestPost as answerQuestion } from "../../functions/api/attempts/[id]/answer.ts";
import { adaptQuizResultToGameFinished } from "../../functions/_lib/game-integrations/quiz-core-adapter.ts";

const BASE = Date.UTC(2026, 6, 21, 12);

async function setup(t, { mode = "official", status = "in_progress" } = {}) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "admin-1", role: "admin" });
  seedUser(ctx, { id: "player" });
  const token = await createSession(ctx, "player");
  createValidRound(ctx, { opensAt: BASE - 60_000, closesAt: BASE + 3_600_000 });
  const order = Array.from({ length: 10 }, (_, index) => `round-1-q-${index}`);
  ctx.raw.prepare(`INSERT INTO attempts(
    id,user_id,round_id,attempt_number,mode,status,shuffle_seed,question_order_json,started_at,current_question_started_at)
    VALUES('attempt-1','player','round-1',1,?,?, 'seed',?,?,?)`).run(mode, status, JSON.stringify(order), BASE, BASE);
  for (let index = 0; index < 9; index++) {
    ctx.raw.prepare(`INSERT INTO attempt_answers(
      attempt_id,question_id,choice_id,question_order,choice_order_json,correct,response_time_ms,points,answered_at)
      VALUES('attempt-1',?,?,?,'[]',1,1000,100,?)`).run(order[index], `${order[index]}-c-0`, index, BASE + index);
  }
  const request = () => answerQuestion({
    request: createAuthenticatedRequest("https://test/api/attempts/attempt-1/answer", {
      token,
      method: "POST",
      body: { questionId: order[9], choiceId: `${order[9]}-c-0` },
    }),
    env: ctx.env,
    params: { id: "attempt-1" },
  });
  return { ctx, request };
}

test("official final answer persists Quiz result and normalized outbox atomically", async t => {
  const { ctx, request } = await setup(t);
  const response = await withFrozenTime(BASE + 1_000, request);
  assert.equal(response.status, 200);

  const attempt = ctx.raw.prepare("SELECT * FROM attempts WHERE id='attempt-1'").get();
  const outbox = ctx.raw.prepare("SELECT * FROM quiz_core_event_outbox WHERE source_id='attempt-1'").get();
  assert.equal(attempt.status, "completed");
  assert.equal(outbox.delivery_state, "pending");
  assert.equal(outbox.attempt_count, 0);

  const expected = adaptQuizResultToGameFinished({
    contractVersion: 1,
    attemptId: "attempt-1",
    roundId: "round-1",
    organizationId: "org-1",
    userId: "player",
    status: "completed",
    mode: "official",
    startedAt: BASE,
    finishedAt: BASE + 1_000,
    score: Number(attempt.score),
    correctAnswers: Number(attempt.correct_answers),
    questionsAnswered: 10,
    maxStreak: Number(attempt.max_streak),
    integrity: { valid: true },
  });
  assert.deepEqual(JSON.parse(outbox.envelope_json), expected);
  assert.deepEqual(JSON.parse(outbox.payload_json), expected.payload);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_progress").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_statistics").get().total, 0);
});

test("repeating the final answer preserves one deterministic outbox item", async t => {
  const { ctx, request } = await setup(t);
  const first = await withFrozenTime(BASE + 1_000, request);
  const repeated = await withFrozenTime(BASE + 2_000, request);
  assert.equal(first.status, 200);
  assert.equal(repeated.status, 200);
  assert.equal((await responseJson(repeated)).alreadySaved, true);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM quiz_core_event_outbox").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT event_id FROM quiz_core_event_outbox").get().event_id, "quiz:attempt:attempt-1:finished");
});

test("practice and ineligible attempts never create outbox items", async t => {
  const practice = await setup(t, { mode: "practice" });
  assert.equal((await withFrozenTime(BASE + 1_000, practice.request)).status, 200);
  assert.equal(practice.ctx.raw.prepare("SELECT COUNT(*) total FROM quiz_core_event_outbox").get().total, 0);

  const invalid = await setup(t, { status: "invalid" });
  assert.equal((await withFrozenTime(BASE + 1_000, invalid.request)).status, 404);
  assert.equal(invalid.ctx.raw.prepare("SELECT COUNT(*) total FROM quiz_core_event_outbox").get().total, 0);
});

test("outbox write failure rolls back the answer and Quiz completion", async t => {
  const { ctx, request } = await setup(t);
  ctx.raw.exec("CREATE TRIGGER reject_quiz_outbox BEFORE INSERT ON quiz_core_event_outbox BEGIN SELECT RAISE(ABORT, 'outbox_unavailable'); END");
  const response = await withFrozenTime(BASE + 1_000, request);
  assert.equal(response.status, 409);
  assert.equal(ctx.raw.prepare("SELECT status FROM attempts WHERE id='attempt-1'").get().status, "in_progress");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM attempt_answers WHERE attempt_id='attempt-1'").get().total, 9);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM quiz_core_event_outbox").get().total, 0);
});

test("an incompatible existing event fails safely without replacing either fact", async t => {
  const { ctx, request } = await setup(t);
  ctx.raw.prepare(`INSERT INTO quiz_core_event_outbox(
    event_id,event_type,event_version,organization_id,user_id,game_id,source_type,source_id,payload_json,envelope_json,created_at,updated_at)
    VALUES('quiz:attempt:attempt-1:finished','GAME_FINISHED',1,'org-1','player','quiz-biblico','attempt','attempt-1','{"status":"completed","score":999999}','{}',?,?)`).run(BASE, BASE);
  const response = await withFrozenTime(BASE + 1_000, request);
  assert.equal(response.status, 409);
  assert.equal(ctx.raw.prepare("SELECT status FROM attempts WHERE id='attempt-1'").get().status, "in_progress");
  assert.equal(ctx.raw.prepare("SELECT payload_json FROM quiz_core_event_outbox").get().payload_json, '{"status":"completed","score":999999}');
});
