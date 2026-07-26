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
import { onRequestGet } from "../../functions/api/admin/users/[id]/platform.ts";

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "member", displayName: "Membro", status: "suspended" });
  seedUser(ctx, { id: "other", organizationId: "org-2" });
  seedUser(ctx, { id: "participant" });
  return { ctx, adminToken: await createSession(ctx, "admin"), participantToken: await createSession(ctx, "participant") };
}

function request(token, id = "member") {
  return createAuthenticatedRequest(`https://test/api/admin/users/${id}/platform`, { token });
}

test("admin platform user view aggregates scoped read models and handles legacy inventory", async t => {
  const { ctx, adminToken } = await setup(t);
  ctx.raw.prepare("INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?,?,?,?,0,0)")
    .run("member", "org-1", 250, 34);
  ctx.raw.prepare(`INSERT INTO user_platform_statistics(
    user_id,organization_id,sessions_completed,games_used,total_play_time_ms,last_activity_at,active_days,
    current_daily_streak,best_daily_streak,official_games_completed,official_questions_answered,perfect_games,
    distinct_official_play_days_utc,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)`)
    .run("member", "org-1", 3, 1, 90_000, 500, 2, 1, 2, 3, 20, 1, 2);
  ctx.raw.prepare(`INSERT INTO user_platform_game_statistics(
    user_id,organization_id,game_id,sessions_started,sessions_completed,questions_answered,correct_answers,
    incorrect_answers,best_score,total_play_time_ms,timed_sessions,last_activity_at,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,0)`).run("member", "org-1", "quiz-biblico", 3, 3, 20, 16, 4, 900, 90_000, 3, 500);
  ctx.raw.prepare(`INSERT INTO platform_achievement_definitions(
    id,code,version,name,description,scope_type,game_id,criterion_json,secret,status,created_at,updated_at)
    VALUES('visible','visible',1,'Visível','Descrição','global',NULL,'{}',0,'active',0,0),
          ('hidden','hidden',1,'Oculta real','Segredo','global',NULL,'{}',1,'active',0,0)`).run();
  ctx.raw.prepare(`INSERT INTO user_platform_achievements(
    id,user_id,organization_id,definition_id,achievement_code,scope_key,source_event_id,unlocked_at)
    VALUES('unlock','member','org-1','visible','visible','global','event',100)`).run();
  const ledger = ctx.raw.prepare(`INSERT INTO platform_coin_ledger(
    id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at,applied_at)
    VALUES(?,?,?,?,1,?,?,?,?,0)`);
  ledger.run("known", "known-event", "member", "org-1", "Compra", "shop_purchase", "avatar-dove", 1);
  ledger.run("legacy", "legacy-event", "member", "org-1", "Compra", "shop_purchase", "old-item", 2);
  ledger.run("equipped", "equipped-event", "member", "org-1", "avatar", "shop_equipment", "avatar-dove", 3);

  const response = await onRequestGet({ request: request(adminToken), env: ctx.env, params: { id: "member" } });
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  assert.equal(data.account.status, "suspended");
  assert.deepEqual(data.progress, {
    level: 2,
    totalXp: 250,
    coins: 34,
    curveVersion: "quadratic-v1",
    levelProgress: { currentXp: 150, targetXp: 300, percent: 50 },
  });
  assert.equal(data.statistics.games[0].gameName, "Quiz Bíblico");
  assert.deepEqual(data.achievements.summary, { total: 2, unlocked: 1, pending: 1 });
  assert.equal(JSON.stringify(data).includes("Oculta real"), false);
  assert.equal(data.inventory.find(item => item.id === "avatar-dove").known, true);
  assert.deepEqual(data.inventory.find(item => item.id === "old-item"), {
    id: "old-item", name: "Item legado", category: "legacy", known: false,
  });
  assert.equal(data.equipment.avatar.name, "Avatar Pomba");
  assert.equal(data.equipment.frame, null);
});

test("admin platform user view returns safe empty state and secure not found", async t => {
  const { ctx, adminToken } = await setup(t);
  const emptyResponse = await onRequestGet({ request: request(adminToken), env: ctx.env, params: { id: "member" } });
  const empty = await responseJson(emptyResponse);
  assert.equal(emptyResponse.status, 200);
  assert.equal(empty.progress.totalXp, 0);
  assert.equal(empty.statistics.games.length, 0);
  assert.equal(empty.inventory.length, 0);
  assert.deepEqual(empty.equipment, { avatar: null, frame: null });

  for (const id of ["missing", "other"]) {
    const response = await onRequestGet({ request: request(adminToken, id), env: ctx.env, params: { id } });
    assert.equal(response.status, 404);
    assert.deepEqual(await responseJson(response), { error: "not_found" });
    assert.equal(response.headers.get("cache-control"), "no-store, private");
  }
});

test("admin platform user view requires members.manage", async t => {
  const { ctx, participantToken } = await setup(t);
  const response = await onRequestGet({ request: request(participantToken), env: ctx.env, params: { id: "member" } });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
});
