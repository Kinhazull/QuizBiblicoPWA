import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sha256 } from "../../functions/_lib/security.ts";

const migrationsDir=fileURLToPath(new URL("../../drizzle/",import.meta.url));
class D1Statement {
  constructor(database,sql,bindings=[]){this.database=database;this.sql=sql;this.bindings=bindings}
  bind(...bindings){return new D1Statement(this.database,this.sql,bindings)}
  statement(){return this.database.prepare(this.sql)}
  async first(column){const row=this.statement().get(...this.bindings);return column&&row?row[column]:row||null}
  async all(){const results=this.statement().all(...this.bindings);return{success:true,results,meta:{changes:0}}}
  async run(){return this.executeRun()}
  executeRun(){const result=this.statement().run(...this.bindings);return{success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid||0)}}}
}
class TestD1 {
  constructor(database){this.database=database}
  prepare(sql){return new D1Statement(this.database,sql)}
  async batch(statements){this.database.exec("BEGIN IMMEDIATE");try{const results=statements.map(statement=>statement.executeRun());this.database.exec("COMMIT");return results}catch(error){this.database.exec("ROLLBACK");throw error}}
  exec(sql){this.database.exec(sql)}
}

export function applyMigrations(database){for(const file of readdirSync(migrationsDir).filter(file=>file.endsWith(".sql")).sort())database.exec(readFileSync(`${migrationsDir}/${file}`,"utf8"))}
export function createTestDatabase(){const raw=new DatabaseSync(":memory:");applyMigrations(raw);const DB=new TestD1(raw);return{raw,DB,env:{DB},close:()=>raw.close(),reset:()=>{throw new Error("Create a fresh database per test")}}}
export function seedOrganization(ctx,{id="org-1",name="Comunidade Teste"}={}){ctx.raw.prepare("INSERT INTO organizations(id,name,slug,created_at) VALUES(?,?,?,?)").run(id,name,id,0);ctx.raw.prepare("INSERT INTO groups(id,organization_id,name,active,created_at) VALUES(?,?,?,?,?)").run(`${id}-group`,id,"Jovens",1,0);return{id,groupId:`${id}-group`}}
export function seedUser(ctx,{id="user-1",organizationId="org-1",username=id,displayName=id,role="participant",status="active",passwordHash="hash",passwordSalt="salt",nickname=null,useNickname=false,profilePublic=true}={}){ctx.raw.prepare("INSERT INTO users(id,organization_id,group_id,username,display_name,password_hash,password_salt,role,status,must_change_password,approved_at,created_at,updated_at,nickname,use_nickname_in_ranking,profile_public) VALUES(?,?,?,?,?,?,?,?,?,0,0,0,0,?,?,?)").run(id,organizationId,`${organizationId}-group`,username,displayName,passwordHash,passwordSalt,role,status,nickname,useNickname?1:0,profilePublic?1:0);return{id,organizationId,username}}
export async function createSession(ctx,userId,{token=`token-${userId}`,expiresAt=Date.now()+3600000}={}){ctx.raw.prepare("INSERT INTO sessions(id,user_id,token_hash,persistent,expires_at,last_seen_at,created_at) VALUES(?,?,?,0,?,?,?)").run(`session-${userId}-${token}`,userId,await sha256(token),expiresAt,0,0);return token}
export function createAuthenticatedRequest(url,{token,method="GET",body,headers={}}={}){const values={origin:new URL(url).origin,cookie:`quiz_session=${token}`,...headers};if(body!==undefined)values["content-type"]="application/json";return new Request(url,{method,headers:values,body:body===undefined?undefined:JSON.stringify(body)})}
export function validQuestion(index=0){return{reference:`Jo ${index+1}:1`,book:"João",theme:"Vida de Jesus",category:"Evangelhos",difficulty:"medium",prompt:`Pergunta bíblica válida número ${index+1}, qual é a resposta?`,commentary:`Comentário ${index+1}`,choices:[`Correta ${index+1}`,`Alternativa B ${index+1}`,`Alternativa C ${index+1}`,`Alternativa D ${index+1}`],correctIndex:0}}
export function createValidRound(ctx,{id="round-1",organizationId="org-1",createdBy="admin-1",status="active",opensAt=Date.now()-60000,closesAt=Date.now()+3600000,attemptLimit=3,seconds=20,advancedRules={allowPractice:true},seasonId=null,roundType="special"}={}){ctx.raw.prepare("INSERT INTO rounds(id,organization_id,title,theme,description,status,opens_at,closes_at,official_attempt_limit,seconds_per_question,season_id,round_type,advanced_rules_json,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id,organizationId,"Rodada Teste","Tema Teste","Descrição",status,opensAt,closesAt,attemptLimit,seconds,seasonId,roundType,JSON.stringify(advancedRules),createdBy,0,0);for(let index=0;index<10;index++){const question=validQuestion(index),questionId=`${id}-q-${index}`;ctx.raw.prepare("INSERT INTO questions(id,round_id,position,reference,prompt,commentary,active) VALUES(?,?,?,?,?,?,1)").run(questionId,id,index+1,question.reference,question.prompt,question.commentary);question.choices.forEach((text,position)=>ctx.raw.prepare("INSERT INTO choices(id,question_id,text,position,correct) VALUES(?,?,?,?,?)").run(`${questionId}-c-${position}`,questionId,text,position,position===0?1:0))}return id}
export function readAttempt(ctx,id){return ctx.raw.prepare("SELECT * FROM attempts WHERE id=?").get(id)}
export function readAttemptAnswers(ctx,id){return ctx.raw.prepare("SELECT * FROM attempt_answers WHERE attempt_id=? ORDER BY question_order").all(id)}
export async function responseJson(response){const text=await response.text();return text?JSON.parse(text):null}
export async function withFrozenTime(now,callback){const original=Date.now;Date.now=()=>now;try{return await callback()}finally{Date.now=original}}
