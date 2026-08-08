import assert from "node:assert/strict";
import test from "node:test";
import { APPLICATION_TABLES, PRIVACY_TABLE_CLASSIFICATION } from "../../shared/operational-schema-contract.mjs";
import { anonymizeUserAccount } from "../../functions/_lib/privacy-lifecycle.ts";
import { onRequestGet as exportPrivacy } from "../../functions/api/privacy/me.ts";
import { onRequestPatch as resolvePrivacyRequest } from "../../functions/api/admin/privacy-requests.ts";
import { hashPassword } from "../../functions/_lib/security.ts";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";

test("privacy lifecycle classifies every operational table through schema 0036", () => {
  assert.equal(APPLICATION_TABLES.length, 64);
  assert.deepEqual(Object.keys(PRIVACY_TABLE_CLASSIFICATION).sort(), [...APPLICATION_TABLES].sort());
  for (const [table, policy] of Object.entries(PRIVACY_TABLE_CLASSIFICATION)) {
    assert.ok(policy.categories.length, table);
    assert.match(policy.lifecycle, /^(EXPORT|ANONYMIZE|DELETE|PRESERVE|PRESERVE_FOR_SECURITY|PRESERVE_FOR_IDEMPOTENCY|ORGANIZATION_OWNED|INVESTIGATE)$/);
  }
});

async function fixture(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx); seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "editor", displayName: "Editora Real", username: "editora" });
  seedUser(ctx, { id: "other" }); seedUser(ctx, { id: "outsider", organizationId: "org-2" });
  const token = await createSession(ctx, "editor");
  await createSession(ctx, "editor", { token: "second-device" });
  const now = Date.UTC(2026, 7, 8);
  ctx.raw.prepare(`INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES('editor','org-1',120,8,?,?)`).run(now, now);
  ctx.raw.prepare(`INSERT INTO platform_xp_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at,applied_at) VALUES('xp-1','event-xp-1','editor','org-1',120,'Teste','game','game-1',?,?)`).run(now, now);
  ctx.raw.prepare(`INSERT INTO platform_coin_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at,applied_at) VALUES('coin-1','event-coin-1','editor','org-1',8,'Compra','shop_purchase','avatar-leao',?,?)`).run(now, now);
  ctx.raw.prepare(`INSERT INTO notification_receipts(user_id,notification_key,read_at) VALUES('editor','notice-1',?)`).run(now);
  ctx.raw.prepare(`INSERT INTO content_items(id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,payload_json,version,author_id,created_at,updated_at,source) VALUES('content-1','org-1','wordle-biblico','DRAFT','Personagens','EASY','Gn 1:1','[]','{}',1,'editor',?,?,'UNIVERSAL_CMS')`).run(now, now);
  ctx.raw.prepare(`INSERT INTO privacy_requests(id,user_id,organization_id,request_type,status,requested_at) VALUES('request-1','editor','org-1','deletion','pending',?)`).run(now);
  return { ctx, token, now };
}

test("modern user export is structured, tenant scoped and contains no credentials", async t => {
  const { ctx, token } = await fixture(t);
  const response = await exportPrivacy({ request: createAuthenticatedRequest("https://test/api/privacy/me", { token }), env: ctx.env });
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store, private");
  const data = await responseJson(response);
  assert.equal(data.version, 2); assert.equal(data.subject.userId, "editor");
  assert.equal(data.platform.progress.totalXp, 120); assert.equal(data.platform.xpLedger.length, 1);
  assert.equal(data.platform.coinLedger.length, 1); assert.equal(data.communications.notifications.length, 1);
  assert.equal(data.editorialContributions.authoredContent[0].id, "content-1");
  const serialized = JSON.stringify(data);
  for (const secret of ["password_hash", "password_salt", "token_hash", "quiz_session"]) assert.equal(serialized.includes(secret), false, secret);
  assert.equal(serialized.includes("outsider"), false);
});

test("isolated anonymization is idempotent, revokes access and preserves organizational CMS and ledgers", async t => {
  const { ctx, now } = await fixture(t);
  const input = { userId: "editor", organizationId: "org-1", resolvedBy: "other", requestId: "request-1", now };
  assert.deepEqual(await anonymizeUserAccount(ctx.env, input), { alreadyAnonymized: false });
  assert.deepEqual(await anonymizeUserAccount(ctx.env, input), { alreadyAnonymized: true });
  const user = ctx.raw.prepare("SELECT username,display_name,nickname,status,password_hash,last_login_at FROM users WHERE id='editor'").get();
  assert.match(user.username, /^removed_/); assert.equal(user.display_name, "Participante removido");
  assert.equal(user.nickname, null); assert.equal(user.status, "rejected"); assert.equal(user.password_hash, "removed"); assert.equal(user.last_login_at, null);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='editor'").get().n, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM notification_receipts WHERE user_id='editor'").get().n, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM content_items WHERE id='content-1' AND author_id='editor'").get().n, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM platform_xp_ledger WHERE user_id='editor'").get().n, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM platform_coin_ledger WHERE user_id='editor'").get().n, 1);
  assert.equal(ctx.raw.prepare("SELECT status FROM privacy_requests WHERE id='request-1'").get().status, "completed");
  assert.equal(ctx.raw.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.equal(ctx.raw.prepare("SELECT display_name FROM users WHERE id='other'").get().display_name, "other");
});

test("administrative execution requires real permission, password, organization and explicit confirmation", async t => {
  const { ctx } = await fixture(t);
  const password = "Senha administrativa forte";
  const credential = await hashPassword(password);
  seedUser(ctx, { id: "admin", role: "admin", passwordHash: credential.hash, passwordSalt: credential.salt });
  const adminToken = await createSession(ctx, "admin");
  const request = body => createAuthenticatedRequest("https://test/api/admin/privacy-requests", {
    token: adminToken, method: "PATCH", body: { id: "request-1", action: "approve", password, ...body },
  });
  assert.equal((await resolvePrivacyRequest({ request: request({}), env: ctx.env })).status, 400);
  assert.equal((await resolvePrivacyRequest({ request: request({ confirmation: "ANONIMIZAR_CONTA", password: "errada" }), env: ctx.env })).status, 403);
  const response = await resolvePrivacyRequest({ request: request({ confirmation: "ANONIMIZAR_CONTA" }), env: ctx.env });
  assert.equal(response.status, 200);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='editor'").get().n, 0);
});
