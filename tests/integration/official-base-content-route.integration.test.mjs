import test from "node:test";
import assert from "node:assert/strict";
import {
  createAuthenticatedRequest,
  createSession,
  createTestDatabase,
  responseJson,
  seedOrganization,
  seedUser,
} from "../helpers/integration.mjs";
import { onRequestPost } from "../../functions/api/admin/content/import-official-base.ts";

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(() => ctx.close());
  seedOrganization(ctx);
  seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "participant", role: "participant" });
  return {
    ctx,
    adminToken: await createSession(ctx, "admin"),
    participantToken: await createSession(ctx, "participant"),
  };
}

const call = (ctx, token, body) => onRequestPost({
  request: createAuthenticatedRequest("https://test/api/admin/content/import-official-base", {
    token,
    method: "POST",
    body,
  }),
  env: ctx.env,
});

test("official base endpoint defaults to a read-only dry-run", async t => {
  const { ctx, adminToken } = await setup(t);
  const response = await call(ctx, adminToken, {});
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.dryRun, true);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);
});

test("official base endpoint refuses application without the exact confirmation", async t => {
  const { ctx, adminToken } = await setup(t);
  const response = await call(ctx, adminToken, { commit: true, confirmation: "wrong" });
  assert.equal(response.status, 400);
  assert.equal((await responseJson(response)).error, "official_base_confirmation_required");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);
});

test("a participant cannot run even the official base dry-run", async t => {
  const { ctx, participantToken } = await setup(t);
  const response = await call(ctx, participantToken, {});
  assert.equal(response.status, 403);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);
});
