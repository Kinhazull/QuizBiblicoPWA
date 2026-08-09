import assert from "node:assert/strict";
import test from "node:test";
import { createAuthenticatedRequest, createSession, createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { getPlatformAnalytics, parseAnalyticsPeriod } from "../../functions/_lib/platform-analytics.ts";
import { onRequestGet } from "../../functions/api/admin/platform-analytics.ts";
import { effectivePermissions, hasPermission } from "../../functions/_lib/permissions.ts";

function seedAnalytics(ctx, organizationId, userId, now) {
  const author = userId;
  const contentId=`content-${organizationId}`,selectionId=`selection-${organizationId}`,participationId=`participation-${organizationId}`,finishId=`finish-${organizationId}`;
  ctx.raw.prepare(`INSERT INTO content_items(id,organization_id,game_type,status,category,difficulty,tags_json,payload_json,version,author_id,created_at,updated_at) VALUES(?,?,?,'PUBLISHED','Evangelhos','EASY','[]','{}',1,?,?,?)`).run(contentId, organizationId, "wordle-biblico", author, now, now);
  ctx.raw.prepare(`INSERT INTO universal_content_library(organization_id,content_id,game_type,content_version,difficulty,themes_json,books_json,tags_json,usage_count,first_published_at,availability_status,created_at,updated_at) VALUES(?,?,?,1,'EASY','["Evangelhos"]','[]','[]',1,?,'AVAILABLE',?,?)`).run(organizationId,contentId,"wordle-biblico",now,now,now);
  ctx.raw.prepare(`INSERT INTO generated_game_selections(id,organization_id,requested_by_user_id,game_type,mode,selection_key,algorithm_version,seed_hash,request_fingerprint,status,filters_json,created_at) VALUES(?,?,?,?,?,?,1,?,?,'ACTIVE','{}',?)`).run(selectionId,organizationId,userId,"wordle-biblico","FREE_PLAY",`key-${organizationId}`,`seed-${organizationId}`,`fingerprint-${organizationId}`,now);
  ctx.raw.prepare(`INSERT INTO generated_game_participations(id,selection_id,organization_id,user_id,game_type,mode,status,started_at,finished_at,finish_event_id,created_at,updated_at) VALUES(?,?,?,?,?,'FREE_PLAY','FINISHED',?,?,?,?,?)`).run(participationId,selectionId,organizationId,userId,"wordle-biblico",now-5000,now,finishId,now-5000,now);
  ctx.raw.prepare(`INSERT INTO core_platform_events(event_id,event_type,event_version,occurred_at,organization_id,user_id,source_kind,source_service,source_game_id,source_id,payload_json,fingerprint,status,created_at,updated_at) VALUES(?,'GAME_FINISHED',2,?,?,?,'game','test','wordle-biblico',?,'{"correctAnswers":1,"questionsAnswered":1}',?,'completed',?,?)`).run(finishId,now,organizationId,userId,participationId,`fp-${organizationId}`,now,now);
  ctx.raw.prepare(`INSERT INTO generated_game_participation_usage(participation_id,organization_id,content_id,content_version,recorded_at) VALUES(?,?,?,1,?)`).run(participationId,organizationId,contentId,now);
  ctx.raw.prepare(`INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?,?,20,2,?,?)`).run(userId,organizationId,now,now);
  ctx.raw.prepare(`INSERT INTO platform_xp_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,created_at,applied_at) VALUES(?,?,?, ?,20,'game','game',?,?)`).run(`xp-${organizationId}`,`xp-event-${organizationId}`,userId,organizationId,now,now);
  ctx.raw.prepare(`INSERT INTO platform_coin_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,created_at,applied_at) VALUES(?,?,?, ?,2,'game','game',?,?)`).run(`coin-${organizationId}`,`coin-event-${organizationId}`,userId,organizationId,now,now);
  ctx.raw.prepare(`INSERT INTO user_platform_statistics(user_id,organization_id,current_daily_streak,created_at,updated_at) VALUES(?,?,2,?,?)`).run(userId,organizationId,now,now);
  ctx.raw.prepare(`INSERT INTO user_platform_statistics_active_days(user_id,organization_id,day_key,first_activity_at,last_activity_at) VALUES(?,?,'2026-08-08',?,?)`).run(userId,organizationId,now,now);
}

function seedDailyOutcome(ctx, { organizationId, userId, gameType, suffix, won, now }) {
  const contentId=`daily-content-${suffix}`,selectionId=`daily-selection-${suffix}`,participationId=`daily-participation-${suffix}`,finishId=`daily-finish-${suffix}`;
  ctx.raw.prepare(`INSERT INTO content_items(id,organization_id,game_type,status,category,difficulty,tags_json,payload_json,version,author_id,created_at,updated_at) VALUES(?,?,?,'PUBLISHED','Evangelhos','EASY','[]','{}',1,?,?,?)`).run(contentId,organizationId,gameType,userId,now,now);
  ctx.raw.prepare(`INSERT INTO generated_game_selections(id,organization_id,requested_by_user_id,game_type,mode,selection_key,algorithm_version,seed_hash,request_fingerprint,status,filters_json,created_at) VALUES(?,?,?,?,? ,?,1,?,?,'ACTIVE','{}',?)`).run(selectionId,organizationId,userId,gameType,"DAILY",`daily-key-${suffix}`,`daily-seed-${suffix}`,`daily-fingerprint-${suffix}`,now);
  ctx.raw.prepare(`INSERT INTO generated_game_participations(id,selection_id,organization_id,user_id,game_type,mode,status,started_at,finished_at,finish_event_id,created_at,updated_at) VALUES(?,?,?,?,?,'DAILY','FINISHED',?,?,?,?,?)`).run(participationId,selectionId,organizationId,userId,gameType,now-1000,now,finishId,now-1000,now);
  ctx.raw.prepare(`INSERT INTO core_platform_events(event_id,event_type,event_version,occurred_at,organization_id,user_id,source_kind,source_service,source_game_id,source_id,payload_json,fingerprint,status,created_at,updated_at) VALUES(?,'GAME_FINISHED',2,?,?,?,'game','test',?,?,?,?,'completed',?,?)`).run(finishId,now,organizationId,userId,gameType,participationId,JSON.stringify({correctAnswers:won?1:0,questionsAnswered:1}),`daily-fp-${suffix}`,now,now);
}

test("platform analytics aggregates existing data and isolates organizations without PII", async () => {
  const ctx=createTestDatabase(),now=Date.UTC(2026,7,8,12);
  seedOrganization(ctx,{id:"org-a"});seedOrganization(ctx,{id:"org-b"});
  seedUser(ctx,{id:"admin-a",organizationId:"org-a",role:"admin",displayName:"Secret Name",username:"secret@example.test"});
  seedUser(ctx,{id:"user-b",organizationId:"org-b"});seedAnalytics(ctx,"org-a","admin-a",now);seedAnalytics(ctx,"org-b","user-b",now);
  const prepared=[];
  const boundedEnv={DB:{prepare(sql){prepared.push(sql);return ctx.DB.prepare(sql)}}};
  const result=await getPlatformAnalytics(boundedEnv,"org-a",{key:"7d",from:now-7*86400000,to:now+1});
  assert.equal(result.overview.started,1);assert.equal(result.overview.completed,1);assert.equal(result.overview.wins,1);
  assert.equal(result.games.length,7);assert.equal(result.games.find(game=>game.gameType==="wordle-biblico").usedContent,1);
  assert.equal(result.economy.xpGranted,20);assert.equal(result.economy.coinsGranted,2);
  const serialized=JSON.stringify(result);assert.doesNotMatch(serialized,/Secret Name|secret@example\.test|correctAnswer|payload_json/);
  assert.ok(prepared.length<=14,"analytics must keep a constant query budget");
  assert.ok(prepared.every(sql=>!/(?<![A-Z])IN\s*\(\s*\?/i.test(sql)),"analytics must not build a bound-parameter IN list");
  ctx.close();
});

test("analytics endpoint requires the modern permission while accepting historical compatibility", async () => {
  const ctx=createTestDatabase(),now=Date.now();seedOrganization(ctx,{id:"org-a"});seedUser(ctx,{id:"viewer",organizationId:"org-a"});
  const token=await createSession(ctx,"viewer");
  let response=await onRequestGet({request:createAuthenticatedRequest("http://local/api/admin/platform-analytics?period=7d",{token}),env:ctx.env});
  assert.equal(response.status,403);
  ctx.raw.prepare("INSERT INTO user_permissions(user_id,permission_code,granted_by,granted_at) VALUES('viewer','reports.view','viewer',?)").run(now);
  assert.equal(await hasPermission(ctx.env,{id:"viewer",role:"participant"},"analytics.view"),true);
  assert.ok((await effectivePermissions(ctx.env,{id:"viewer",role:"participant"})).includes("analytics.view"));
  response=await onRequestGet({request:createAuthenticatedRequest("http://local/api/admin/platform-analytics?period=7d",{token}),env:ctx.env});
  assert.equal(response.status,200);assert.match(response.headers.get("cache-control")||"",/no-store/);
  ctx.close();
});

test("daily analytics milestones count victories and exclude completed losses", async () => {
  const ctx=createTestDatabase(),now=Date.UTC(2026,7,8,12);
  seedOrganization(ctx,{id:"org-a"});seedUser(ctx,{id:"user-a",organizationId:"org-a"});
  const games=["quiz-biblico","wordle-biblico","linha-do-tempo-biblica","memoria-biblica"];
  games.forEach((gameType,index)=>seedDailyOutcome(ctx,{organizationId:"org-a",userId:"user-a",gameType,suffix:String(index),won:index<3,now}));
  const result=await getPlatformAnalytics(ctx.env,"org-a",{key:"today",from:now-10000,to:now+1});
  assert.equal(result.daily.completed,4);
  assert.equal(result.daily.wins,3);
  assert.equal(result.daily.completed3,1);
  assert.equal(result.daily.completed7,0);
  ctx.close();
});

test("analytics periods reject invalid and overlong custom ranges", () => {
  const now=Date.UTC(2026,7,8);
  assert.equal(parseAnalyticsPeriod(new URL("http://local?period=30d"),now).key,"30d");
  assert.throws(()=>parseAnalyticsPeriod(new URL(`http://local?period=custom&from=0&to=${now}`),now),/analytics_invalid_period/);
  assert.throws(()=>parseAnalyticsPeriod(new URL("http://local?period=forever"),now),/analytics_invalid_period/);
});
