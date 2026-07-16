import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "../helpers/integration.mjs";
import { assertResetPolicy, buildResetBatch } from "../../scripts/lib/pilot-reset-policy.mjs";

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
  assert.equal(db.prepare("SELECT COUNT(*) total FROM audit_logs WHERE action='production.pilot_data_reset'").get().total, 1);
});

