import assert from "node:assert/strict";
import test from "node:test";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { onRequestPost as claimMission } from "../../functions/api/platform/missions/[id]/claim.ts";
import { claimMissionReward } from "../../functions/_lib/platform-missions.ts";
import { getUserProgress } from "../../functions/_lib/platform-progress.ts";

const NOW = Date.UTC(2026, 6, 22, 12);

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  return { ctx, token: await createSession(ctx, "player") };
}

function assign(ctx, { id = "mission-1", state = "completed", progress = 1, target = 1, xp = 50, coins = 5 } = {}) {
  const definitionId = `definition:${id}`;
  ctx.raw.prepare(`INSERT INTO platform_mission_definitions(
    id,code,version,name,description,cadence,scope_type,target,progress_unit,criterion_json,reward_json,status,created_at,updated_at)
    VALUES(?,?,1,?,?,'daily','global',?,'partidas','{}',?,'active',?,?)`
  ).run(definitionId, `daily_global_${id}`, id, id, target, JSON.stringify({ xp, coins }), NOW - 1000, NOW - 1000);
  ctx.raw.prepare(`INSERT INTO user_platform_missions(
    id,user_id,organization_id,definition_id,mission_code,cadence,scope_key,window_key,target,progress,state,assigned_at,expires_at,completed_at)
    VALUES(?,'player','org-1',?,?,'daily','global','2026-07-22',?,?,?,?,?,?)`
  ).run(id, definitionId, `daily_global_${id}`, target, progress, state, NOW - 1000, NOW + 86_400_000, state === "completed" ? NOW : null);
  return id;
}

async function requestClaim(ctx, token, id) {
  const request = createAuthenticatedRequest(`https://test/api/platform/missions/${id}/claim`, { token, method: "POST" });
  return claimMission({ request, env: ctx.env, params: { id } });
}

test("valid claim grants Progress rewards through the authenticated endpoint", async t => {
  const { ctx, token } = await setup(t);
  const id = assign(ctx, { xp: 50, coins: 5 });
  const response = await requestClaim(ctx, token, id);
  assert.equal(response.status, 200);
  assert.equal((await responseJson(response)).mission.state, "claimed");
  assert.deepEqual(await getUserProgress(ctx.env, "player", "org-1"), {
    level: 1, totalXp: 50, coins: 5, curveVersion: "quadratic-v1",
    levelProgress: { currentXp: 50, targetXp: 100, percent: 50 },
  });
});

test("duplicate claim returns the claimed mission without duplicating rewards", async t => {
  const { ctx, token } = await setup(t);
  const id = assign(ctx);
  assert.equal((await requestClaim(ctx, token, id)).status, 200);
  const duplicate = await requestClaim(ctx, token, id);
  assert.equal(duplicate.status, 200);
  assert.equal((await responseJson(duplicate)).mission.state, "claimed");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='mission'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='mission'").get().total, 1);
});

test("incomplete mission cannot be claimed", async t => {
  const { ctx, token } = await setup(t);
  const id = assign(ctx, { state: "active", progress: 0 });
  const response = await requestClaim(ctx, token, id);
  assert.equal(response.status, 409);
  assert.deepEqual(await responseJson(response), { error: "mission_not_claimable" });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_progress").get().total, 0);
});

test("nonexistent mission is returned as not found", async t => {
  const { ctx, token } = await setup(t);
  const response = await requestClaim(ctx, token, "missing-mission");
  assert.equal(response.status, 404);
  assert.deepEqual(await responseJson(response), { error: "mission_not_found" });
});

test("deterministic mission ledgers make direct service replay idempotent", async t => {
  const { ctx } = await setup(t);
  const id = assign(ctx, { xp: 100, coins: 10 });
  await claimMissionReward(ctx.env, id, "player", "org-1", NOW + 1000);
  await claimMissionReward(ctx.env, id, "player", "org-1", NOW + 2000);
  const progress = await getUserProgress(ctx.env, "player", "org-1");
  assert.equal(progress.totalXp, 100);
  assert.equal(progress.coins, 10);
  assert.equal(ctx.raw.prepare("SELECT COUNT(DISTINCT event_id) total FROM platform_xp_ledger WHERE source_type='mission'").get().total, 1);
});

test("successful claim persists CLAIMED state and claimed timestamp exactly once", async t => {
  const { ctx } = await setup(t);
  const id = assign(ctx);
  await claimMissionReward(ctx.env, id, "player", "org-1", NOW + 1000);
  await claimMissionReward(ctx.env, id, "player", "org-1", NOW + 2000);
  assert.deepEqual({ ...ctx.raw.prepare("SELECT state,claimed_at claimedAt FROM user_platform_missions WHERE id=?").get(id) }, {
    state: "claimed", claimedAt: NOW + 1000,
  });
});

test("unauthenticated claim is rejected without changing mission state", async t => {
  const { ctx } = await setup(t);
  const id = assign(ctx);
  const response = await claimMission({ request: new Request(`https://test/api/platform/missions/${id}/claim`, { method: "POST" }), env: ctx.env, params: { id } });
  assert.equal(response.status, 401);
  assert.equal(ctx.raw.prepare("SELECT state FROM user_platform_missions WHERE id=?").get(id).state, "completed");
});
