import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { hashPassword, PASSWORD_ITERATIONS, verifyPasswordDetails } from "../../functions/_lib/security.ts";
import { onRequestPost as login } from "../../functions/api/auth/login.ts";

async function legacyHash(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations }, key, 256);
  return Buffer.from(bits).toString("base64url");
}

test("new credentials use the production-safe Workers work factor", async () => {
  const credential = await hashPassword("SenhaSegura123!", "salt");
  assert.equal(PASSWORD_ITERATIONS, 100_000);
  assert.match(credential.hash, /^pbkdf2-sha256\$100000\$/);
});

for (const iterations of [100_000, 25_000]) {
  test(`legacy ${iterations} credential logs in without synchronous rehash`, async t => {
    const ctx = createTestDatabase(); t.after(ctx.close); seedOrganization(ctx);
    const password = "SenhaSegura123!", salt = `legacy-${iterations}`;
    const passwordHash = await legacyHash(password, salt, iterations);
    seedUser(ctx, { id: `legacy-${iterations}`, username: `legacy-${iterations}`, passwordHash, passwordSalt: salt });
    const verification = await verifyPasswordDetails(password, salt, passwordHash);
    assert.deepEqual(verification, { valid: true, needsUpgrade: false });
    const response = await login({
      request: new Request("https://test/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: `legacy-${iterations}`, password }) }),
      env: ctx.env,
    });
    assert.equal(response.status, 200);
    assert.equal((await responseJson(response)).ok, true);
    assert.equal(ctx.raw.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id=?").get(`legacy-${iterations}`).n, 1);
    assert.equal(ctx.raw.prepare("SELECT password_hash FROM users WHERE id=?").get(`legacy-${iterations}`).password_hash, passwordHash);
  });
}
