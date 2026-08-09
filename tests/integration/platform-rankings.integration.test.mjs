import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser, createSession, createAuthenticatedRequest, responseJson } from "../helpers/integration.mjs";
import { getPlatformRanking, organizationWeekWindow, parseRankingRequest } from "../../functions/_lib/platform-rankings.ts";
import { onRequestGet as readRankings } from "../../functions/api/platform/rankings.ts";

function progress(ctx, userId, organizationId, xp, updatedAt) {
  ctx.raw.prepare("INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?,?,?,?,0,?)")
    .run(userId, organizationId, xp, 0, updatedAt);
}

function xp(ctx, id, userId, organizationId, amount, appliedAt) {
  ctx.raw.prepare(`INSERT INTO platform_xp_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at,applied_at)
    VALUES(?,?,?,?,?,'Ranking','test',NULL,?,?)`).run(id, id, userId, organizationId, amount, appliedAt, appliedAt);
}

function game(ctx, userId, organizationId, gameId, score, sessions = 1, updatedAt = 1, performance = null) {
  ctx.raw.prepare(`INSERT INTO user_platform_game_statistics(user_id,organization_id,game_id,sessions_completed,best_score,best_normalized_performance,created_at,updated_at)
    VALUES(?,?,?,?,?,?,0,?)`).run(userId, organizationId, gameId, sessions, score, performance, updatedAt);
}

function setup() {
  const ctx = createTestDatabase();
  seedOrganization(ctx, { id: "org-1" });
  seedOrganization(ctx, { id: "org-2" });
  ctx.raw.prepare("UPDATE organizations SET timezone='America/Sao_Paulo'").run();
  for (let index = 1; index <= 12; index += 1) seedUser(ctx, { id: `p${index}`, organizationId: "org-1", displayName: `Pessoa ${index}`, nickname: index === 1 ? "Luz" : null, useNickname: index === 1 });
  seedUser(ctx, { id: "outsider", organizationId: "org-2", displayName: "Outra organização" });
  return ctx;
}

test("overall ranking is tenant-scoped, deterministically ordered and returns own position outside top N", async () => {
  const ctx = setup();
  try {
    for (let index = 1; index <= 12; index += 1) progress(ctx, `p${index}`, "org-1", 1300 - index * 100, index);
    progress(ctx, "outsider", "org-2", 999999, 0);
    ctx.raw.prepare(`INSERT INTO platform_coin_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at,applied_at)
      VALUES('equipment','equipment','p1','org-1',1,'avatar','shop_equipment','avatar-lion',1,1)`).run();
    const result = await getPlatformRanking(ctx.env, { userId: "p12", organizationId: "org-1" }, { scope: "overall", gameId: null, limit: 10 }, 0);
    assert.equal(result.entries.length, 10);
    assert.deepEqual(result.entries.slice(0, 2).map(row => [row.position, row.displayName, row.totalXp]), [[1, "Luz", 1200], [2, "Pessoa 2", 1100]]);
    assert.equal(result.entries.some(row => row.displayName === "Outra organização"), false);
    assert.equal(result.entries[0].equipment.avatar, "avatar-lion");
    assert.equal(result.me.position, 12);
    assert.equal(result.entries.some(row => row.isCurrentUser), false);
  } finally { ctx.close(); }
});

test("weekly ranking uses applied XP within the organization-local Monday boundary", async () => {
  const ctx = setup();
  try {
    progress(ctx, "p1", "org-1", 500, 1); progress(ctx, "p2", "org-1", 500, 1);
    const now = Date.UTC(2026, 7, 12, 15); // Wednesday in São Paulo.
    const window = organizationWeekWindow(now, "America/Sao_Paulo");
    xp(ctx, "before", "p1", "org-1", 500, window.from - 1);
    xp(ctx, "inside-1", "p1", "org-1", 40, window.from);
    xp(ctx, "inside-2", "p2", "org-1", 30, window.to - 1);
    xp(ctx, "after", "p2", "org-1", 999, window.to);
    const result = await getPlatformRanking(ctx.env, { userId: "p2", organizationId: "org-1" }, { scope: "weekly", gameId: null, limit: 10 }, now);
    assert.deepEqual(result.entries.map(row => [row.displayName, row.value]), [["Luz", 40], ["Pessoa 2", 30]]);
    assert.deepEqual(result.period, window);
  } finally { ctx.close(); }
});

test("overall ties prefer completed participation before the stable technical tie", async () => {
  const ctx = setup();
  try {
    progress(ctx, "p1", "org-1", 500, 10); progress(ctx, "p2", "org-1", 500, 10);
    ctx.raw.prepare("INSERT INTO user_platform_statistics(user_id,organization_id,sessions_completed,created_at,updated_at) VALUES('p2','org-1',4,0,1)").run();
    const result = await getPlatformRanking(ctx.env, { userId: "p1", organizationId: "org-1" }, { scope: "overall", gameId: null, limit: 10 });
    assert.deepEqual(result.entries.map(row => row.displayName), ["Pessoa 2", "Luz"]);
  } finally { ctx.close(); }
});

test("all seven game rankings use their comparable persisted metric", async () => {
  const ctx = setup();
  try {
    progress(ctx, "p1", "org-1", 200, 1); progress(ctx, "p2", "org-1", 300, 1);
    game(ctx, "p1", "org-1", "wordle-biblico", 600, 2, 2);
    game(ctx, "p2", "org-1", "wordle-biblico", 500, 9, 1);
    const wordle = await getPlatformRanking(ctx.env, { userId: "p2", organizationId: "org-1" }, { scope: "game", gameId: "wordle-biblico", limit: 10 });
    assert.deepEqual(wordle.entries.map(row => [row.displayName, row.value]), [["Luz", 600], ["Pessoa 2", 500]]);
    game(ctx, "p1", "org-1", "memoria-biblica", 300, 4, 2, 80);
    game(ctx, "p2", "org-1", "memoria-biblica", 900, 2, 1, 90);
    game(ctx, "outsider", "org-2", "memoria-biblica", 9999, 9, 0, 100);
    const memory = await getPlatformRanking(ctx.env, { userId: "p1", organizationId: "org-1" }, { scope: "game", gameId: "memoria-biblica", limit: 10 });
    assert.deepEqual(memory.entries.map(row => [row.displayName, row.value]), [["Pessoa 2", 90], ["Luz", 80]]);
    assert.equal(memory.valueFormat, "percentage");
    assert.equal(memory.entries.some(row => row.displayName === "Outra organização"), false);
    assert.equal(memory.games.length, 7);
    assert.equal(memory.games.every(item => item.available), true);
  } finally { ctx.close(); }
});

test("normalized game ranking excludes users without a projected performance and resolves ties deterministically", async () => {
  const ctx = setup();
  try {
    for (const id of ["p1", "p2", "p3"]) progress(ctx, id, "org-1", 100, 1);
    game(ctx, "p1", "org-1", "quem-sou-eu", 700, 2, 2, 70);
    game(ctx, "p2", "org-1", "quem-sou-eu", 900, 4, 3, 70);
    game(ctx, "p3", "org-1", "quem-sou-eu", 999, 99, 1, null);
    const result = await getPlatformRanking(ctx.env, { userId: "p3", organizationId: "org-1" }, { scope: "game", gameId: "quem-sou-eu", limit: 10 });
    assert.deepEqual(result.entries.map(row => row.displayName), ["Pessoa 2", "Luz"]);
    assert.equal(result.me, null);
  } finally { ctx.close(); }
});

test("ranking endpoint is authenticated, read-only and validates finite parameters", async () => {
  const ctx = setup();
  try {
    progress(ctx, "p1", "org-1", 100, 1);
    const token = await createSession(ctx, "p1");
    const ok = await readRankings({ request: createAuthenticatedRequest("http://local/api/platform/rankings?scope=overall&limit=10", { token }), env: ctx.env });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("cache-control"), "no-store, private");
    assert.equal((await responseJson(ok)).entries[0].displayName, "Luz");
    const invalid = await readRankings({ request: createAuthenticatedRequest("http://local/api/platform/rankings?scope=game&gameId=unknown", { token }), env: ctx.env });
    assert.equal(invalid.status, 400);
    assert.throws(() => parseRankingRequest(new URL("http://local/?scope=overall&limit=1000")), /invalid_ranking_limit/);
    const anonymous = await readRankings({ request: new Request("http://local/api/platform/rankings"), env: ctx.env });
    assert.equal(anonymous.status, 401);
  } finally { ctx.close(); }
});
