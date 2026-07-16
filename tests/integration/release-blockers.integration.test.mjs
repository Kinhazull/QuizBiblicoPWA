import assert from "node:assert/strict";
import test from "node:test";
import {
  createTestDatabase,
  seedOrganization,
  seedUser,
  createSession,
  createAuthenticatedRequest,
  createValidRound,
  responseJson,
  withFrozenTime,
} from "../helpers/integration.mjs";
import { onRequestPost as answerQuestion } from "../../functions/api/attempts/[id]/answer.ts";
import { onRequestGet as rankings } from "../../functions/api/rankings.ts";
import { badgeStats, syncBadges } from "../../functions/_lib/badges.ts";

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "player" });
  createValidRound(ctx, { createdBy: "admin", closesAt: Date.now() + 3_600_000 });
  const token = await createSession(ctx, "player");
  return { ctx, token };
}

test("client timeout never scores the automatically selected correct choice", async t => {
  const base = Date.now();
  const { ctx, token } = await setup(t);
  const order = Array.from({ length: 10 }, (_, index) => `round-1-q-${index}`);
  ctx.raw.prepare("INSERT INTO attempts(id,user_id,round_id,attempt_number,mode,status,shuffle_seed,started_at,question_order_json) VALUES('client-timeout','player','round-1',1,'official','in_progress','seed',?,?)").run(base, JSON.stringify(order));
  const response = await withFrozenTime(base + 20_000, () => answerQuestion({
    request: createAuthenticatedRequest("https://test/api/attempts/client-timeout/answer", { token, method: "POST", body: { questionId: order[0], choiceId: `${order[0]}-c-0`, timedOut: true } }),
    env: ctx.env,
    params: { id: "client-timeout" },
  }));
  const data = await responseJson(response);
  const saved = ctx.raw.prepare("SELECT correct,points FROM attempt_answers WHERE attempt_id='client-timeout'").get();
  assert.equal(response.status, 200);
  assert.equal(data.correct, false);
  assert.equal(data.timedOut, true);
  assert.equal(data.points, 0);
  assert.equal(saved.correct, 0);
  assert.equal(saved.points, 0);
  const retry = await answerQuestion({
    request: createAuthenticatedRequest("https://test/api/attempts/client-timeout/answer", { token, method: "POST", body: { questionId: order[0], choiceId: `${order[0]}-c-0`, timedOut: true } }),
    env: ctx.env,
    params: { id: "client-timeout" },
  });
  const retried = await responseJson(retry);
  assert.equal(retried.alreadySaved, true);
  assert.equal(retried.timedOut, true);
  assert.equal(retried.points, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM attempt_answers WHERE attempt_id='client-timeout'").get().total, 1);
});

test("cancelled Journey keeps evidence but leaves rankings and reconciles badges", async t => {
  const { ctx, token } = await setup(t);
  ctx.raw.prepare("INSERT INTO attempts(id,user_id,round_id,attempt_number,mode,status,shuffle_seed,score,correct_answers,total_time_ms,max_streak,started_at,completed_at,question_order_json) VALUES('cancelled-result','player','round-1',1,'official','completed','s',9500,10,10000,10,1,2,'[]')").run();
  ctx.raw.prepare("UPDATE rounds SET status='closed',closes_at=1 WHERE id='round-1'").run();
  await syncBadges(ctx.env, "player");
  assert.ok(ctx.raw.prepare("SELECT COUNT(*) total FROM user_badges WHERE user_id='player'").get().total > 0);

  ctx.raw.prepare("UPDATE rounds SET status='cancelled' WHERE id='round-1'").run();
  const response = await rankings({ request: createAuthenticatedRequest("https://test/api/rankings?type=weekly&roundId=round-1", { token }), env: ctx.env });
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.deepEqual(data.ranking, []);

  const stats = await badgeStats(ctx.env, "player");
  assert.equal(stats.roundsPlayed, 0);
  assert.equal(stats.attempts, 0);
  assert.equal(stats.podiums, 0);
  await syncBadges(ctx.env, "player");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_badges WHERE user_id='player'").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM attempts WHERE id='cancelled-result'").get().total, 1);
});
