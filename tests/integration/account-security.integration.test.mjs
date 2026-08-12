import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { hashPassword, sha256, verifyPassword } from "../../functions/_lib/security.ts";
import { onRequestPost as recover } from "../../functions/api/auth/recover.ts";

async function setupRecovery(t, { createdAt = Date.now(), usedAt = null } = {}) {
  const ctx = createTestDatabase(); t.after(ctx.close); seedOrganization(ctx);
  const old = await hashPassword("SenhaAntiga123!");
  seedUser(ctx, { id: "recover-user", username: "recover-user", passwordHash: old.hash, passwordSalt: old.salt });
  const code = "ABCDE-FGHIJ";
  ctx.raw.prepare("INSERT INTO account_recovery_codes(id,user_id,code_hash,created_at,used_at) VALUES(?,?,?,?,?)").run("code-1", "recover-user", await sha256(code), createdAt, usedAt);
  ctx.raw.prepare("INSERT INTO account_recovery_codes(id,user_id,code_hash,created_at,used_at) VALUES(?,?,?,?,NULL)").run("code-2", "recover-user", await sha256("KLMNO-PQRST"), createdAt);
  ctx.raw.prepare("INSERT INTO sessions(id,user_id,token_hash,persistent,expires_at,last_seen_at,created_at) VALUES(?,?,?,?,?,?,?)").run("session-1", "recover-user", "token-hash", 0, Date.now() + 60_000, 0, 0);
  return { ctx, code };
}

function request(code) {
  return new Request("https://test/api/auth/recover", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" }, body: JSON.stringify({ username: "recover-user", code, password: "SenhaNova123!" }) });
}

test("valid recovery is single-use, invalidates all recovery codes and prior sessions", async t => {
  const { ctx, code } = await setupRecovery(t);
  const response = await recover({ request: request(code), env: ctx.env });
  assert.equal(response.status, 200); assert.equal((await responseJson(response)).ok, true);
  const stored = ctx.raw.prepare("SELECT password_hash,password_salt FROM users WHERE id=?").get("recover-user");
  assert.equal(await verifyPassword("SenhaNova123!", stored.password_salt, stored.password_hash), true);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id=?").get("recover-user").n, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM account_recovery_codes WHERE user_id=? AND used_at IS NULL").get("recover-user").n, 0);
  const replay = await recover({ request: request(code), env: ctx.env });
  assert.equal(replay.status, 403); assert.deepEqual(await responseJson(replay), { error: "invalid_recovery" });
});

for (const scenario of [
  { name: "expired", options: { createdAt: Date.now() - 91 * 24 * 60 * 60 * 1000 } },
  { name: "used", options: { usedAt: Date.now() - 1000 } },
]) test(`${scenario.name} recovery code is rejected without changing password`, async t => {
  const { ctx, code } = await setupRecovery(t, scenario.options);
  const before = ctx.raw.prepare("SELECT password_hash FROM users WHERE id=?").get("recover-user").password_hash;
  const response = await recover({ request: request(code), env: ctx.env });
  assert.equal(response.status, 403); assert.deepEqual(await responseJson(response), { error: "invalid_recovery" });
  assert.equal(ctx.raw.prepare("SELECT password_hash FROM users WHERE id=?").get("recover-user").password_hash, before);
});

test("unknown account and invalid code share the same public recovery error", async t => {
  const { ctx } = await setupRecovery(t);
  const invalidCode = await recover({ request: request("ZZZZZ-ZZZZZ"), env: ctx.env });
  const unknownRequest = new Request("https://test/api/auth/recover", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.11" }, body: JSON.stringify({ username: "unknown-user", code: "ZZZZZ-ZZZZZ", password: "SenhaNova123!" }) });
  const unknown = await recover({ request: unknownRequest, env: ctx.env });
  assert.equal(invalidCode.status, 403); assert.equal(unknown.status, 403);
  assert.deepEqual(await responseJson(invalidCode), await responseJson(unknown));
});

