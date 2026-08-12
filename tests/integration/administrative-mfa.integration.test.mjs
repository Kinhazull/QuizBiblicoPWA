import test from "node:test";
import assert from "node:assert/strict";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { hashPassword } from "../../functions/_lib/security.ts";
import { totpAt } from "../../functions/_lib/mfa.ts";
import { onRequestPost as login } from "../../functions/api/auth/login.ts";
import { onRequestPost as setupMfa } from "../../functions/api/auth/mfa/setup.ts";
import { onRequestPost as confirmMfa } from "../../functions/api/auth/mfa/confirm.ts";
import { onRequestPost as verifyMfa } from "../../functions/api/auth/mfa/verify.ts";
import { onRequestPost as resetMfa } from "../../functions/api/admin/users/[id]/reset-mfa.ts";
import { requirePermission } from "../../functions/_lib/permissions.ts";

async function seedCredential(ctx, input) {
  const password = "Senha-Forte-2026!", credential = await hashPassword(password);
  seedUser(ctx, { ...input, passwordHash: credential.hash, passwordSalt: credential.salt });
  return password;
}

test("admin sem MFA autentica somente para enrollment e guard administrativo fecha", async t => {
  const ctx=createTestDatabase();t.after(ctx.close);seedOrganization(ctx);const password=await seedCredential(ctx,{id:"admin",role:"admin",username:"admin"});
  const response=await login({request:new Request("https://test/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:"admin",password})}),env:ctx.env});
  const body=await responseJson(response);assert.equal(response.status,200);assert.equal(body.mfaEnrollmentRequired,true);assert.equal(body.user.mfaVerified,false);
  const cookie=response.headers.get("set-cookie").match(/quiz_session=([^;]+)/)[1];
  await assert.rejects(()=>requirePermission(createAuthenticatedRequest("https://test/api/admin",{token:cookie}),ctx.env,"members.manage"),error=>error instanceof Response&&error.status===403);
});

test("setup, confirmação, segundo fator e replay TOTP", async t => {
  const ctx=createTestDatabase();t.after(ctx.close);seedOrganization(ctx);const password=await seedCredential(ctx,{id:"admin",role:"admin",username:"admin"});
  const enrollmentToken=await createSession(ctx,"admin",{mfaVerified:0});
  const setupResponse=await setupMfa({request:createAuthenticatedRequest("https://test/api/auth/mfa/setup",{token:enrollmentToken,method:"POST"}),env:ctx.env});
  const setup=await responseJson(setupResponse),code=(await totpAt(setup.secret)).code;
  const confirmed=await confirmMfa({request:createAuthenticatedRequest("https://test/api/auth/mfa/confirm",{token:enrollmentToken,method:"POST",body:{code}}),env:ctx.env});
  const confirmedBody=await responseJson(confirmed);assert.equal(confirmed.status,200);assert.equal(confirmedBody.recoveryCodes.length,8);assert.equal(ctx.raw.prepare("SELECT status FROM user_mfa WHERE user_id='admin'").get().status,"active");
  const loginResponse=await login({request:new Request("https://test/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:"admin",password})}),env:ctx.env});
  const challenge=await responseJson(loginResponse);assert.equal(challenge.mfaRequired,true);assert.equal(loginResponse.headers.get("set-cookie"),null);
  const nextCode=(await totpAt(setup.secret,Date.now()+30000)).code;
  const verified=await verifyMfa({request:new Request("https://test/api/auth/mfa/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({challengeToken:challenge.challengeToken,code:nextCode})}),env:ctx.env});
  assert.equal(verified.status,200);assert.match(verified.headers.get("set-cookie"),/quiz_session=/);
  const replay=await verifyMfa({request:new Request("https://test/api/auth/mfa/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({challengeToken:challenge.challengeToken,code:nextCode})}),env:ctx.env});
  assert.equal(replay.status,401);
});

test("owner é único por organização e reset assistido é tenant-scoped", async t => {
  const ctx=createTestDatabase();t.after(ctx.close);seedOrganization(ctx);seedOrganization(ctx,{id:"org-2"});
  seedUser(ctx,{id:"owner",role:"owner"});seedUser(ctx,{id:"admin",role:"admin"});seedUser(ctx,{id:"owner-2",organizationId:"org-2",role:"owner"});
  assert.throws(()=>seedUser(ctx,{id:"another-owner",role:"owner"}),/UNIQUE/);
  const ownerToken=await createSession(ctx,"owner",{mfaVerified:1});
  ctx.raw.prepare("INSERT INTO user_mfa(user_id,status,encrypted_secret,secret_iv,key_version,requires_enrollment,created_at,updated_at) VALUES('admin','active','x','y',1,0,0,0)").run();
  const reset=await resetMfa({request:createAuthenticatedRequest("https://test/api/admin/users/admin/reset-mfa",{token:ownerToken,method:"POST"}),env:ctx.env,params:{id:"admin"}});assert.equal(reset.status,200);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_mfa WHERE user_id='admin'").get().total,0);
  const cross=await resetMfa({request:createAuthenticatedRequest("https://test/api/admin/users/owner-2/reset-mfa",{token:ownerToken,method:"POST"}),env:ctx.env,params:{id:"owner-2"}});assert.equal(cross.status,404);
  const self=await resetMfa({request:createAuthenticatedRequest("https://test/api/admin/users/owner/reset-mfa",{token:ownerToken,method:"POST"}),env:ctx.env,params:{id:"owner"}});assert.equal(self.status,403);
});

test("admin jamais executa reset assistido de admin", async t => {
  const ctx=createTestDatabase();t.after(ctx.close);seedOrganization(ctx);seedUser(ctx,{id:"admin-a",role:"admin"});seedUser(ctx,{id:"admin-b",role:"admin"});
  const token=await createSession(ctx,"admin-a",{mfaVerified:1});const response=await resetMfa({request:createAuthenticatedRequest("https://test/api/admin/users/admin-b/reset-mfa",{token,method:"POST"}),env:ctx.env,params:{id:"admin-b"}});assert.equal(response.status,403);
});
