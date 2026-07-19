import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase,seedOrganization,seedUser,createSession,createAuthenticatedRequest,createValidRound,responseJson } from "../helpers/integration.mjs";
import { hashPassword } from "../../functions/_lib/security.ts";
import { onRequestGet as rankings } from "../../functions/api/rankings.ts";
import { onRequestGet as exportCsv } from "../../functions/api/admin/exports.ts";
import { onRequestPost as backup } from "../../functions/api/admin/backup.ts";
import { onRequestPost as createQuestion } from "../../functions/api/admin/questions.ts";

async function setup(t){
  const ctx=createTestDatabase();t.after(ctx.close);seedOrganization(ctx);
  seedUser(ctx,{id:"admin",role:"admin",displayName:"Administrador"});
  seedUser(ctx,{id:"player",displayName:"=SOMA(A1:A2)",nickname:"Jovem",useNickname:true});
  seedUser(ctx,{id:"practice",displayName:"Somente treino"});
  const [adminToken,playerToken]=await Promise.all([createSession(ctx,"admin"),createSession(ctx,"player")]);
  createValidRound(ctx,{createdBy:"admin"});
  return{ctx,adminToken,playerToken};
}

function attempt(ctx,{id,userId="player",mode="official",status="completed",number=1,score=1000,correct=10,time=10000}={}){
  ctx.raw.prepare("INSERT INTO attempts(id,user_id,round_id,attempt_number,mode,status,shuffle_seed,score,correct_answers,total_time_ms,max_streak,started_at,completed_at,question_order_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id,userId,"round-1",number,mode,status,`seed-${id}`,score,correct,time,correct,1,status==="completed"?2:null,"[]");
}

test("ranking executes persisted official/completed filters and nickname privacy",async t=>{
  const{ctx,playerToken}=await setup(t);
  attempt(ctx,{id:"official",score:1234});
  attempt(ctx,{id:"training",userId:"practice",mode:"practice",score:99999});
  attempt(ctx,{id:"invalid",userId:"practice",status:"invalid",number:2,score:88888});
  attempt(ctx,{id:"abandoned",userId:"practice",status:"abandoned",number:3,score:77777});
  const response=await rankings({request:createAuthenticatedRequest("https://test/api/rankings?type=weekly&roundId=round-1",{token:playerToken}),env:ctx.env});
  assert.equal(response.status,200);const data=await responseJson(response);
  assert.deepEqual(data.ranking.map(row=>row.displayName),["Jovem"]);
  assert.equal(data.ranking[0].score,1234);
});

test("participant and expired session are denied by the real admin handler without writes",async t=>{
  const{ctx,playerToken}=await setup(t);const before=ctx.raw.prepare("SELECT COUNT(*) n FROM question_bank").get().n;
  const denied=await createQuestion({request:createAuthenticatedRequest("https://test/api/admin/questions",{token:playerToken,method:"POST",body:{}}),env:ctx.env});
  const expiredToken=await createSession(ctx,"admin",{token:"expired",expiresAt:1});
  const expired=await createQuestion({request:createAuthenticatedRequest("https://test/api/admin/questions",{token:expiredToken,method:"POST",body:{}}),env:ctx.env});
  assert.equal(denied.status,403);assert.equal(expired.status,401);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM question_bank").get().n,before);
});

test("CSV export neutralizes formulas, remains UTF-8, private and audited",async t=>{
  const{ctx,adminToken}=await setup(t);
  for(const [index,prefix] of ["+","-","@","\t","\r"].entries())seedUser(ctx,{id:`csv-${index}`,username:`csv-${index}`,displayName:`${prefix}comando`});
  const response=await exportCsv({request:createAuthenticatedRequest("https://test/api/admin/exports?type=members",{token:adminToken}),env:ctx.env});
  const bytes=new Uint8Array(await response.clone().arrayBuffer()),text=await response.text();assert.equal(response.status,200);assert.match(response.headers.get("cache-control"),/no-store/);assert.deepEqual([...bytes.slice(0,3)],[0xef,0xbb,0xbf]);
  for(const value of ["'=SOMA","'+comando","'-comando","'@comando","'\tcomando","'\rcomando"])assert.ok(text.includes(value),value);
  assert.ok(!/password_hash|password_salt|quiz_session|token-/i.test(text));
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='data.exported'").get().n,1);
});

test("backup authenticates password and excludes credentials, sessions and tokens",async t=>{
  const{ctx,adminToken}=await setup(t),password="Senha forte 123!",credentials=await hashPassword(password,"test-salt");
  ctx.raw.prepare("UPDATE users SET password_hash=?,password_salt=? WHERE id='admin'").run(credentials.hash,credentials.salt);
  const wrong=await backup({request:createAuthenticatedRequest("https://test/api/admin/backup",{token:adminToken,method:"POST",body:{password:"errada"}}),env:ctx.env});assert.equal(wrong.status,403);
  const response=await backup({request:createAuthenticatedRequest("https://test/api/admin/backup",{token:adminToken,method:"POST",body:{password}}),env:ctx.env});
  assert.equal(response.status,200);assert.match(response.headers.get("cache-control"),/no-store/);assert.equal(response.headers.get("x-content-type-options"),"nosniff");
  const text=await response.text(),data=JSON.parse(text);assert.equal(data.schemaVersion,25);assert.equal(data.credentialsExcluded,true);assert.equal(data.tables.sessions,undefined);
  assert.ok(!/password_hash|password_salt|token-admin|quiz_session|test-salt/.test(text));
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='backup.exported'").get().n,1);
});
