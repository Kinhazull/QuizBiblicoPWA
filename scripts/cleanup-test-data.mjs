#!/usr/bin/env node
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
const args=Object.fromEntries(process.argv.slice(2).map((value,index,all)=>value.startsWith("--")?[value.slice(2),all[index+1]?.startsWith("--")?true:all[index+1]]:null).filter(Boolean));
const mode=args.execute?"execute":"dry-run",dbPath=String(args.db||""),organizationId=String(args.organization||""),adminId=String(args["preserve-admin"]||""),backup=String(args.backup||"");
if(!dbPath||!organizationId||!adminId)throw new Error("Use --db <arquivo-local> --organization <id> --preserve-admin <id> e --dry-run ou --execute.");
if(args.execute&&args["dry-run"])throw new Error("Escolha somente --dry-run ou --execute.");
if(mode==="execute"&&(!backup||!existsSync(backup)))throw new Error("A execução exige --backup apontando para um arquivo existente.");
const db=new DatabaseSync(dbPath);db.exec("PRAGMA foreign_keys=ON");
const admin=db.prepare("SELECT id,role,status FROM users WHERE id=? AND organization_id=?").get(adminId,organizationId);if(!admin||admin.role!=="admin")throw new Error("A conta preservada precisa ser o administrador da organização.");
const specs=[
 ["attempt_answers","attempt_id IN (SELECT a.id FROM attempts a JOIN users u ON u.id=a.user_id WHERE u.organization_id=?)"],
 ["attempts","user_id IN (SELECT id FROM users WHERE organization_id=?)"],["notification_receipts","user_id IN (SELECT id FROM users WHERE organization_id=?)"],["user_badges","user_id IN (SELECT id FROM users WHERE organization_id=?)"],
 ["season_awards","season_id IN (SELECT id FROM seasons WHERE organization_id=?)"],["season_snapshots","season_id IN (SELECT id FROM seasons WHERE organization_id=?)"],["seasons","organization_id=?"],
 ["rounds","organization_id=?"],["announcements","organization_id=?"],["invitations","organization_id=?"],["privacy_requests","user_id IN (SELECT id FROM users WHERE organization_id=? AND id<>?)"],
 ["sessions","user_id IN (SELECT id FROM users WHERE organization_id=? AND id<>?)"],["legal_consents","user_id IN (SELECT id FROM users WHERE organization_id=? AND id<>?)"],["account_recovery_codes","user_id IN (SELECT id FROM users WHERE organization_id=? AND id<>?)"],["user_permissions","user_id IN (SELECT id FROM users WHERE organization_id=? AND id<>?)"],
 ["users","organization_id=? AND id<>?"],["groups","organization_id=? AND id NOT IN (SELECT group_id FROM users WHERE id=? AND group_id IS NOT NULL)"],
];
const existing=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name)),report=[];
const bindings=where=>(where.match(/\?/g)||[]).length===2?[organizationId,adminId]:[organizationId];
for(const[table,where]of specs){if(!existing.has(table))continue;const params=bindings(where),rows=db.prepare(`SELECT rowid recordId FROM ${table} WHERE ${where} LIMIT 200`).all(...params),total=db.prepare(`SELECT COUNT(*) total FROM ${table} WHERE ${where}`).get(...params).total;report.push({table,total,ids:rows.map(row=>row.recordId)})}
console.log(JSON.stringify({mode,organizationId,preservedAdmin:adminId,preservedApprovedQuestions:true,operations:report},null,2));
if(mode==="execute"){db.exec("BEGIN IMMEDIATE");try{for(const[table,where]of specs){if(!existing.has(table))continue;db.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...bindings(where))}const remains=db.prepare("SELECT COUNT(*) total FROM users WHERE organization_id=? AND id<>?").get(organizationId,adminId).total,approved=existing.has("question_bank")?db.prepare("SELECT COUNT(*) total FROM question_bank WHERE organization_id=? AND review_status='approved'").get(organizationId).total:0;if(remains!==0)throw new Error("Diagnóstico falhou: membros de teste permaneceram.");db.exec("COMMIT");console.log(JSON.stringify({status:"completed",adminPreserved:true,approvedQuestionsPreserved:approved},null,2))}catch(error){db.exec("ROLLBACK");throw error}}
db.close();
