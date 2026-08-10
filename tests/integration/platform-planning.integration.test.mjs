import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { createUniversalDraft, transitionUniversalContentStatus } from "../../functions/_lib/universal-content-store.ts";
import { createPlatformEvent, schedulePlatformEvent } from "../../functions/_lib/platform-events.ts";
import { getPlatformPlanningCalendar, PLATFORM_PLANNING_MAX_RANGE_DAYS } from "../../functions/_lib/platform-planning.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";

async function fixture(t) {
  const ctx=createTestDatabase();t.after(ctx.close);seedOrganization(ctx);seedUser(ctx,{id:"admin",role:"admin"});
  const draft=await createUniversalDraft(ctx.env,"org-1","admin",{gameType:GameType.WORDLE,status:ContentStatus.DRAFT,metadata:{category:"Palavras",tags:["fé"],difficulty:"MEDIUM",biblicalReference:"Efésios 2:8",status:ContentStatus.DRAFT,internalNotes:null},payload:{word:"GRACA",hint:"Favor imerecido"}});
  const published=await transitionUniversalContentStatus(ctx.env,"org-1","admin",draft.content.id,ContentStatus.PUBLISHED,draft.content.version);
  return {ctx,contentId:draft.content.id,version:published.content.version};
}
const input=(contentId,version,overrides={})=>({title:"Evento planejado",description:"Operação",startsAt:Date.UTC(2026,7,31,23),endsAt:Date.UTC(2026,8,2,2),timeZone:"America/Sao_Paulo",games:[{gameType:GameType.WORDLE,contentItems:[{contentId,contentVersion:version}]}],...overrides});

test("planejamento agrega Evento atravessando mês, reservas e checklist pronto",async t=>{const {ctx,contentId,version}=await fixture(t);const identity={organizationId:"org-1",userId:"admin"};const event=await createPlatformEvent(ctx.env,identity,input(contentId,version),100);await schedulePlatformEvent(ctx.env,identity,event.id,200);const data=await getPlatformPlanningCalendar(ctx.env,"org-1",{from:Date.UTC(2026,7,1),to:Date.UTC(2026,9,1),now:Date.UTC(2026,7,15)});assert.equal(data.events.length,1);assert.equal(data.events[0].status,"SCHEDULED");assert.deepEqual(data.events[0].reservations,[{gameType:GameType.WORDLE,count:1}]);assert.equal(data.events[0].checklist.ready,true);assert.equal(data.timeZone,"America/Sao_Paulo")});
test("planejamento deriva pendências e período vazio sem persistir checklist",async t=>{const {ctx}=await fixture(t);ctx.raw.prepare(`INSERT INTO platform_events(id,organization_id,title,description,starts_at,ends_at,time_zone,status,completion_rule,minimum_participations,created_by,created_at,updated_at) VALUES('incomplete','org-1','Incompleto','',1000,2000,'America/Sao_Paulo','DRAFT','ALL',1,'admin',100,100)`).run();const data=await getPlatformPlanningCalendar(ctx.env,"org-1",{from:0,to:10_000,now:20_000});assert.equal(data.events[0].checklist.ready,false);assert.equal(data.events[0].checklist.issues[0].code,"games_required");assert.equal(data.summary.noEventsNext14Days,true)});
test("planejamento filtra jogo e isola organização",async t=>{const {ctx,contentId,version}=await fixture(t);seedOrganization(ctx,{id:"org-2",name:"Outra"});await createPlatformEvent(ctx.env,{organizationId:"org-1",userId:"admin"},input(contentId,version,{startsAt:1_000,endsAt:2_000}),100);const own=await getPlatformPlanningCalendar(ctx.env,"org-1",{from:0,to:3_000,gameType:GameType.WORDLE});const other=await getPlatformPlanningCalendar(ctx.env,"org-2",{from:0,to:3_000});assert.equal(own.events.length,1);assert.equal(other.events.length,0)});
test("planejamento rejeita intervalo inválido ou excessivo",async t=>{const {ctx}=await fixture(t);await assert.rejects(()=>getPlatformPlanningCalendar(ctx.env,"org-1",{from:2,to:1}),/invalid_planning_interval/);await assert.rejects(()=>getPlatformPlanningCalendar(ctx.env,"org-1",{from:0,to:(PLATFORM_PLANNING_MAX_RANGE_DAYS+1)*86_400_000}),/planning_interval_too_large/)});
