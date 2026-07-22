import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser, createSession, createAuthenticatedRequest, responseJson } from "../helpers/integration.mjs";
import { getAchievementSummary, listAchievements, unlockAchievement } from "../../functions/_lib/platform-achievements.ts";
import { onRequestGet as readAchievements } from "../../functions/api/platform/achievements.ts";
import { onRequestGet as readProfile } from "../../functions/api/profile/me.ts";

function seedDefinition(ctx, { id = "achievement-welcome-v1", code = "platform.welcome", version = 1, name = "Primeiros passos", secret = false, scopeType = "global", gameId = null, status = "active" } = {}) {
  ctx.raw.prepare(`INSERT INTO platform_achievement_definitions(id,code,version,name,description,icon,scope_type,game_id,criterion_json,secret,status,created_at,updated_at)
    VALUES(?,?,?,?,?,'⭐',?,?,?, ?,?,0,0)`).run(id, code, version, name, "Conheça a plataforma.", scopeType, gameId, JSON.stringify({ type: "manual_test" }), secret ? 1 : 0, status);
}

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "player" });
  seedUser(ctx, { id: "other", organizationId: "org-2" });
  const token = await createSession(ctx, "player");
  return { ctx, token };
}

test("authenticated catalog lists pending and unlocked achievements without exposing a secret criterion", async t => {
  const { ctx, token } = await setup(t);
  seedDefinition(ctx);
  seedDefinition(ctx, { id: "secret-v1", code: "platform.secret", name: "Segredo revelado", secret: true });
  const response = await readAchievements({ request: createAuthenticatedRequest("https://test/api/platform/achievements", { token }), env: ctx.env });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  const payload = await responseJson(response);
  assert.deepEqual(payload.summary, { total: 2, unlocked: 0, pending: 2 });
  const secret = payload.achievements.find(item => item.code === "platform.secret");
  assert.equal(secret.name, "Conquista secreta");
  assert.equal(secret.criterion, null);
  assert.equal((await readAchievements({ request: new Request("https://test/api/platform/achievements"), env: ctx.env })).status, 401);
});

test("unlock is persistent, idempotent under concurrent calls and organization-scoped", async t => {
  const { ctx } = await setup(t);
  seedDefinition(ctx);
  const input = { userId: "player", organizationId: "org-1", achievementCode: "platform.welcome", sourceEventId: "event-1" };
  const [first, second] = await Promise.all([unlockAchievement(ctx.env, input), unlockAchievement(ctx.env, input)]);
  assert.equal([first.unlocked, second.unlocked].filter(Boolean).length, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements").get().total, 1);
  assert.deepEqual(await getAchievementSummary(ctx.env, "player", "org-1"), { total: 1, unlocked: 1, pending: 0 });
  await assert.rejects(() => unlockAchievement(ctx.env, { ...input, organizationId: "org-2", sourceEventId: "event-cross-org" }), /achievement_user_unavailable/);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements").get().total, 1);
});

test("definition version changes preserve an earlier unlock and game scope is explicit", async t => {
  const { ctx } = await setup(t);
  seedDefinition(ctx);
  await unlockAchievement(ctx.env, { userId: "player", organizationId: "org-1", achievementCode: "platform.welcome", sourceEventId: "event-v1" });
  ctx.raw.prepare("UPDATE platform_achievement_definitions SET status='retired' WHERE id='achievement-welcome-v1'").run();
  seedDefinition(ctx, { id: "achievement-welcome-v2", version: 2, name: "Primeiros passos atualizados" });
  const catalog = await listAchievements(ctx.env, "player", "org-1");
  assert.equal(catalog[0].version, 2);
  assert.equal(catalog[0].unlocked, true);
  const repeated = await unlockAchievement(ctx.env, { userId: "player", organizationId: "org-1", achievementCode: "platform.welcome", sourceEventId: "event-v2" });
  assert.equal(repeated.unlocked, false);
  seedDefinition(ctx, { id: "wordle-v1", code: "wordle.first", scopeType: "game", gameId: "wordle-biblico" });
  await assert.rejects(() => unlockAchievement(ctx.env, { userId: "player", organizationId: "org-1", achievementCode: "wordle.first", sourceEventId: "wordle-event", scopeKey: "global" }), /invalid_achievement_scope/);
});

test("Profile receives only the platform achievement summary and Quiz badges stay separate", async t => {
  const { ctx, token } = await setup(t);
  seedDefinition(ctx);
  await unlockAchievement(ctx.env, { userId: "player", organizationId: "org-1", achievementCode: "platform.welcome", sourceEventId: "profile-event" });
  const response = await readProfile({ request: createAuthenticatedRequest("https://test/api/profile/me", { token }), env: ctx.env });
  assert.equal(response.status, 200);
  const payload = await responseJson(response);
  assert.deepEqual(payload.achievements, { total: 1, unlocked: 1, pending: 0 });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_badges").get().total, 0);
});
