import test from "node:test";
import assert from "node:assert/strict";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { onRequestGet as readCurrentUser } from "../../functions/api/auth/me.ts";
import { onRequestPost as acceptLegalDocuments } from "../../functions/api/auth/legal-acceptance.ts";
import { onRequestPost as register } from "../../functions/api/auth/register.ts";
import { LEGAL_ACCEPTANCE_TYPE, PRIVACY_VERSION, TERMS_VERSION } from "../../functions/_lib/legal.ts";
import { sha256 } from "../../functions/_lib/security.ts";

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(() => ctx.close());
  seedOrganization(ctx);
  seedUser(ctx, { id: "existing-user" });
  const token = await createSession(ctx, "existing-user");
  return { ctx, token };
}

function request(token, body) {
  return createAuthenticatedRequest("https://test/api/auth/legal-acceptance", { token, method: "POST", body, headers: { "user-agent": "legal-test" } });
}

test("existing account is gated until the current 18+ legal version is accepted once", async t => {
  const { ctx, token } = await setup(t);
  const before = await responseJson(await readCurrentUser({ request: createAuthenticatedRequest("https://test/api/auth/me", { token }), env: ctx.env }));
  assert.equal(before.user.legalAcceptanceRequired, true);

  const rejected = await acceptLegalDocuments({ request: request(token, { adultConfirmed: false, legalAccepted: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION }), env: ctx.env });
  assert.equal(rejected.status, 400);
  assert.equal((await responseJson(rejected)).error, "adult_confirmation_required");

  const body = { adultConfirmed: true, legalAccepted: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION };
  assert.equal((await acceptLegalDocuments({ request: request(token, body), env: ctx.env })).status, 200);
  assert.equal((await acceptLegalDocuments({ request: request(token, body), env: ctx.env })).status, 200);
  const rows = ctx.raw.prepare("SELECT terms_version,privacy_version,document_type FROM legal_consents WHERE user_id=?").all("existing-user");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].terms_version, TERMS_VERSION);
  assert.equal(rows[0].privacy_version, PRIVACY_VERSION);
  assert.equal(rows[0].document_type, LEGAL_ACCEPTANCE_TYPE);

  const after = await responseJson(await readCurrentUser({ request: createAuthenticatedRequest("https://test/api/auth/me", { token }), env: ctx.env }));
  assert.equal(after.user.legalAcceptanceRequired, false);
});

test("wrong legal version is rejected without persistence", async t => {
  const { ctx, token } = await setup(t);
  const response = await acceptLegalDocuments({ request: request(token, { adultConfirmed: true, legalAccepted: true, termsVersion: "old", privacyVersion: "old" }), env: ctx.env });
  assert.equal(response.status, 400);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM legal_consents").get().total, 0);
});

test("new registration rejects missing 18+ and persists the current acceptance when confirmed", async t => {
  const ctx = createTestDatabase();
  t.after(() => ctx.close());
  seedOrganization(ctx);
  const inviteCode = "ADULT-V2";
  ctx.raw.prepare(`INSERT INTO invitations(id,organization_id,group_id,code_hash,label,approval_required,max_uses,uses,active,created_by,created_at)
    VALUES(?,?,?,?,?,0,5,0,1,?,0)`).run("invite-adult", "org-1", "org-1-group", await sha256(inviteCode), "Legal v2", "system");
  const payload = { displayName: "Pessoa Adulta", username: "pessoa-adulta", password: "Senha-forte-2026!", inviteCode,
    legalAccepted: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION };
  const registerRequest = body => new Request("https://test/api/auth/register", { method: "POST", headers: { "content-type": "application/json", "user-agent": "legal-test" }, body: JSON.stringify(body) });
  const missing = await register({ request: registerRequest(payload), env: ctx.env });
  assert.equal(missing.status, 400);
  assert.deepEqual(await missing.json(), { error: "adult_confirmation_required" });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM users WHERE username='pessoa-adulta'").get().total, 0);

  const accepted = await register({ request: registerRequest({ ...payload, adultConfirmed: true }), env: ctx.env });
  assert.equal(accepted.status, 201);
  const consent = ctx.raw.prepare(`SELECT c.terms_version termsVersion,c.privacy_version privacyVersion,c.document_type documentType
    FROM legal_consents c JOIN users u ON u.id=c.user_id WHERE u.username='pessoa-adulta'`).get();
  assert.equal(consent.termsVersion, TERMS_VERSION);
  assert.equal(consent.privacyVersion, PRIVACY_VERSION);
  assert.equal(consent.documentType, LEGAL_ACCEPTANCE_TYPE);
});
