import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser, createSession, createAuthenticatedRequest, responseJson } from "../helpers/integration.mjs";
import { claimMissionReward, getCurrentDailyMission, recordMissionProgress } from "../../functions/_lib/platform-missions.ts";
import { getUserProgress } from "../../functions/_lib/platform-progress.ts";
import { onRequestGet as readCurrentMission } from "../../functions/api/platform/missions/current.ts";

function seedDefinition(ctx, { id = "daily-explore-v1", code = "platform.daily.explore", version = 1, cadence = "daily", scopeType = "global", gameId = null, target = 2, reward = { xp: 50, coins: 5 }, status = "active" } = {}) {
  ctx.raw.prepare(`INSERT INTO platform_mission_definitions(id,code,version,name,description,icon,cadence,scope_type,game_id,target,progress_unit,criterion_json,reward_json,status,created_at,updated_at)
    VALUES(?,?,?,?,?,'🎯',?,?,?,?,'ações',?,?,?,0,0)`).run(id, code, version, "Explore a plataforma", "Realize atividades elegíveis.", cadence, scopeType, gameId, target, JSON.stringify({ eventType: "platform.activity.v1" }), JSON.stringify(reward), status);
}

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "player" });
  seedUser(ctx, { id: "other", organizationId: "org-2" });
  return { ctx, token: await createSession(ctx, "player") };
}

test("authenticated current mission assigns one daily definition and returns a safe empty state without catalog", async t => {
  const { ctx, token } = await setup(t);
  const empty = await readCurrentMission({ request: createAuthenticatedRequest("https://test/api/platform/missions/current", { token }), env: ctx.env });
  assert.equal(empty.status, 200);
  assert.deepEqual(await responseJson(empty), { mission: null });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_missions").get().total, 0);
  seedDefinition(ctx);
  const [first, second] = await Promise.all([
    getCurrentDailyMission(ctx.env, "player", "org-1", Date.UTC(2026, 6, 19, 12)),
    getCurrentDailyMission(ctx.env, "player", "org-1", Date.UTC(2026, 6, 19, 12)),
  ]);
  assert.equal(first.id, second.id);
  assert.equal(first.state, "active");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_missions").get().total, 1);
  assert.equal((await readCurrentMission({ request: new Request("https://test/api/platform/missions/current"), env: ctx.env })).status, 401);
});

test("daily assignment ignores weekly catalog entries and isolates user and organization", async t => {
  const { ctx } = await setup(t);
  seedDefinition(ctx, { id: "weekly-v1", code: "platform.weekly.future", cadence: "weekly" });
  assert.equal(await getCurrentDailyMission(ctx.env, "player", "org-1", Date.UTC(2026, 6, 19, 12)), null);
  seedDefinition(ctx);
  const own = await getCurrentDailyMission(ctx.env, "player", "org-1", Date.UTC(2026, 6, 19, 12));
  const other = await getCurrentDailyMission(ctx.env, "other", "org-2", Date.UTC(2026, 6, 19, 12));
  assert.notEqual(own.id, other.id);
  await assert.rejects(() => recordMissionProgress(ctx.env, { assignmentId: own.id, userId: "other", organizationId: "org-2", eventId: "cross-org", amount: 1 }), /mission_not_found/);
});

test("mission expiry caused by a read is limited to the authenticated tenant", async t => {
  const { ctx } = await setup(t);
  seedDefinition(ctx);
  const now = Date.UTC(2026, 6, 19, 12);
  const own = await getCurrentDailyMission(ctx.env, "player", "org-1", now);
  const other = await getCurrentDailyMission(ctx.env, "other", "org-2", now);
  ctx.raw.prepare("UPDATE user_platform_missions SET expires_at=? WHERE id IN (?,?)").run(now - 1, own.id, other.id);
  await getCurrentDailyMission(ctx.env, "player", "org-1", now);
  assert.equal(ctx.raw.prepare("SELECT state FROM user_platform_missions WHERE id=?").get(own.id).state, "expired");
  assert.equal(ctx.raw.prepare("SELECT state FROM user_platform_missions WHERE id=?").get(other.id).state, "active");
});

test("progress is idempotent, completes once and does not accept progress after completion", async t => {
  const { ctx } = await setup(t);
  seedDefinition(ctx);
  const now = Date.UTC(2026, 6, 19, 12), mission = await getCurrentDailyMission(ctx.env, "player", "org-1", now);
  const input = { assignmentId: mission.id, userId: "player", organizationId: "org-1", eventId: "activity-1", amount: 1, now: now + 1000 };
  const [first, repeated] = await Promise.all([recordMissionProgress(ctx.env, input), recordMissionProgress(ctx.env, input)]);
  assert.equal(first.progress, 1);
  assert.equal(repeated.progress, 1);
  const completed = await recordMissionProgress(ctx.env, { ...input, eventId: "activity-2", now: now + 2000 });
  assert.equal(completed.progress, 2);
  assert.equal(completed.state, "completed");
  const ignored = await recordMissionProgress(ctx.env, { ...input, eventId: "activity-3", now: now + 3000 });
  assert.equal(ignored.progress, 2);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_mission_progress_events").get().total, 2);
});

test("reward claim grants XP and coins once through deterministic ledgers", async t => {
  const { ctx } = await setup(t);
  seedDefinition(ctx, { target: 1 });
  const now = Date.UTC(2026, 6, 19, 12), mission = await getCurrentDailyMission(ctx.env, "player", "org-1", now);
  await recordMissionProgress(ctx.env, { assignmentId: mission.id, userId: "player", organizationId: "org-1", eventId: "activity-complete", amount: 1, now: now + 1000 });
  const [first, repeated] = await Promise.all([
    claimMissionReward(ctx.env, mission.id, "player", "org-1", now + 2000),
    claimMissionReward(ctx.env, mission.id, "player", "org-1", now + 2000),
  ]);
  assert.equal(first.state, "claimed");
  assert.equal(repeated.state, "claimed");
  assert.deepEqual(await getUserProgress(ctx.env, "player", "org-1"), { level: 1, totalXp: 50, coins: 5, curveVersion: "quadratic-v1", levelProgress: { currentXp: 50, targetXp: 100, percent: 50 } });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='mission'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='mission'").get().total, 1);
});

test("an expired mission cannot progress or be claimed", async t => {
  const { ctx } = await setup(t);
  seedDefinition(ctx);
  const now = Date.UTC(2026, 6, 19, 12), mission = await getCurrentDailyMission(ctx.env, "player", "org-1", now);
  ctx.raw.prepare("UPDATE user_platform_missions SET expires_at=? WHERE id=?").run(now + 1000, mission.id);
  const expired = await recordMissionProgress(ctx.env, { assignmentId: mission.id, userId: "player", organizationId: "org-1", eventId: "late", amount: 1, now: now + 2000 });
  assert.equal(expired.state, "expired");
  assert.equal(expired.progress, 0);
  await assert.rejects(() => claimMissionReward(ctx.env, mission.id, "player", "org-1", now + 3000), /mission_not_claimable/);
});
