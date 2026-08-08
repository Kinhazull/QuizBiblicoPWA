import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "../helpers/integration.mjs";
import { assertResetPolicy, buildResetBatch } from "../../scripts/lib/pilot-reset-policy.mjs";
import { createUniversalDraft, transitionUniversalContentStatus } from "../../functions/_lib/universal-content-store.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";
import { createPlatformEvent, schedulePlatformEvent, startEventSelection } from "../../functions/_lib/platform-events.ts";
import { seedOrganization, seedUser } from "../helpers/integration.mjs";

test("pilot reset removes competition data and preserves accounts, legal records and question bank", t => {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  const db = ctx.raw;
  db.prepare("INSERT INTO organizations(id,name,slug,timezone,created_at) VALUES('org','Org','org','America/Sao_Paulo',0)").run();
  db.prepare("INSERT INTO groups(id,organization_id,name,active,created_at) VALUES('group','org','Grupo',1,0)").run();
  db.prepare(`INSERT INTO users(id,organization_id,group_id,username,display_name,password_hash,password_salt,role,status,must_change_password,created_at,updated_at)
    VALUES('user','org','group','usuario','Usuário','hash','salt','participant','active',0,0,0)`).run();
  db.prepare("INSERT INTO legal_consents(id,user_id,terms_version,privacy_version,accepted_at,organization_id,document_type) VALUES('consent','user','v','v',0,'org','combined')").run();
  db.prepare(`INSERT INTO question_bank(id,organization_id,theme,difficulty,prompt,normalized_prompt,status,times_used,created_by,created_at,updated_at,review_status,version)
    VALUES('bank','org','Tema','medium','Pergunta válida?','pergunta válida?','active',4,'user',0,0,'approved',1)`).run();
  db.prepare("INSERT INTO question_bank_choices(id,question_id,text,position,correct) VALUES('bank-choice','bank','Resposta',0,1)").run();
  db.prepare(`INSERT INTO rounds(id,organization_id,title,theme,status,opens_at,closes_at,official_attempt_limit,seconds_per_question,created_by,created_at,updated_at)
    VALUES('round','org','Teste','Tema','closed',0,1,2,20,'user',0,0)`).run();
  db.prepare("INSERT INTO questions(id,round_id,position,prompt,active,source_question_id) VALUES('question','round',1,'Pergunta válida?',1,'bank')").run();
  db.prepare("INSERT INTO choices(id,question_id,text,correct,position) VALUES('choice','question','Resposta',1,0)").run();
  db.prepare(`INSERT INTO attempts(id,user_id,round_id,attempt_number,mode,status,shuffle_seed,score,correct_answers,total_time_ms,max_streak,started_at,completed_at)
    VALUES('attempt','user','round',1,'official','completed','seed',100,1,1000,1,0,1)`).run();
  db.prepare(`INSERT INTO attempt_answers(attempt_id,question_id,choice_id,question_order,choice_order_json,correct,response_time_ms,points,answered_at)
    VALUES('attempt','question','choice',0,'["choice"]',1,1000,100,1)`).run();
  db.prepare("INSERT INTO user_platform_statistics(user_id,organization_id,sessions_completed,games_used,last_activity_at,active_days,current_daily_streak,best_daily_streak,created_at,updated_at) VALUES('user','org',1,1,1,1,1,1,0,1)").run();
  db.prepare("INSERT INTO user_platform_game_statistics(user_id,organization_id,game_id,sessions_completed,last_activity_at,created_at,updated_at) VALUES('user','org','quiz-biblico',1,1,0,1)").run();
  db.prepare("INSERT INTO user_platform_statistics_active_days(user_id,organization_id,day_key,first_activity_at,last_activity_at) VALUES('user','org','2026-07-19',1,1)").run();
  db.prepare("INSERT INTO user_platform_game_difficulty_statistics(user_id,organization_id,game_id,difficulty_key,sessions_completed,updated_at) VALUES('user','org','quiz-biblico','medium',1,1)").run();

  const statements = buildResetBatch();
  assert.equal(assertResetPolicy(statements), true);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const sql of statements) db.exec(sql);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  assert.equal(db.prepare("SELECT COUNT(*) total FROM users").get().total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM legal_consents").get().total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM question_bank").get().total, 1);
  assert.equal(db.prepare("SELECT times_used FROM question_bank WHERE id='bank'").get().times_used, 0);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM rounds").get().total, 0);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM attempts").get().total, 0);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM attempt_answers").get().total, 0);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM user_platform_statistics").get().total, 0);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM user_platform_game_statistics").get().total, 0);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM audit_logs WHERE action='production.pilot_data_reset'").get().total, 1);
});

test("pilot reset preserves CMS and administrative Event while removing modern participant activity", async t => {
  const ctx = createTestDatabase(); t.after(ctx.close); seedOrganization(ctx); seedUser(ctx, { id: "admin", role: "admin" }); seedUser(ctx, { id: "player" });
  const draft = await createUniversalDraft(ctx.env, "org-1", "admin", { gameType: GameType.WORDLE, status: ContentStatus.DRAFT,
    metadata: { category: "Palavras", tags: ["fé"], difficulty: "MEDIUM", biblicalReference: "Efésios 2:8", status: ContentStatus.DRAFT, internalNotes: null },
    payload: { word: "GRACA", hint: "Favor imerecido" } });
  const published = await transitionUniversalContentStatus(ctx.env, "org-1", "admin", draft.content.id, ContentStatus.PUBLISHED, draft.content.version);
  const event = await createPlatformEvent(ctx.env, { organizationId: "org-1", userId: "admin" }, { title: "Evento preservado", startsAt: 1000, endsAt: 10000,
    timeZone: "America/Sao_Paulo", games: [{ gameType: GameType.WORDLE, contentItems: [{ contentId: draft.content.id, contentVersion: published.content.version }] }] }, 100);
  const scheduled = await schedulePlatformEvent(ctx.env, { organizationId: "org-1", userId: "admin" }, event.id, 200);
  await startEventSelection(ctx.env, { organizationId: "org-1", userId: "player" }, event.id, scheduled.event.games[0].selectionId, 2000);
  ctx.raw.prepare("INSERT INTO platform_event_reward_ledger(id,event_id,organization_id,user_id,reward_type,xp_amount,coin_amount,created_at) VALUES('reset-reward',?,'org-1','player','participation',10,0,2)").run(event.id);
  ctx.raw.prepare(`INSERT INTO generated_game_selections(id,organization_id,requested_by_user_id,game_type,mode,selection_key,
    algorithm_version,seed_hash,request_fingerprint,status,filters_json,created_at)
    VALUES('free-selection','org-1','player',?,'FREE_PLAY','reset-free-play-selection',1,'seed','fingerprint','ACTIVE','{}',300)`).run(GameType.WORDLE);
  ctx.raw.exec("BEGIN IMMEDIATE");
  try { for (const sql of buildResetBatch()) ctx.raw.exec(sql); ctx.raw.exec("COMMIT"); } catch (error) { ctx.raw.exec("ROLLBACK"); throw error; }
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM universal_content_library").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT status FROM platform_events WHERE id=?").get(event.id).status, "SCHEDULED");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_event_participations").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_event_reward_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selections WHERE mode='FREE_PLAY'").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selections WHERE mode='EVENT'").get().total, 1);
  assert.equal(ctx.raw.prepare("PRAGMA foreign_key_check").all().length, 0);
});
