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
import { onRequestGet as readCurrentUser } from "../../functions/api/auth/me.ts";

const legacyLeaderPermissions = [
  "members.manage",
  "invitations.manage",
  "questions.edit",
  "questions.review",
  "rounds.manage",
  "reports.view",
  "audit.view",
];

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(() => ctx.close());
  seedOrganization(ctx);
  seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "leader", role: "leader" });
  seedUser(ctx, { id: "partial", role: "participant" });
  seedUser(ctx, { id: "participant", role: "participant" });
  ctx.raw.prepare("INSERT INTO user_permissions(user_id,permission_code,granted_by,granted_at) VALUES(?,?,?,?)")
    .run("leader", "notifications.manage", "admin", 1);
  ctx.raw.prepare("INSERT INTO user_permissions(user_id,permission_code,granted_by,granted_at) VALUES(?,?,?,?)")
    .run("partial", "questions.review", "admin", 1);
  return ctx;
}

async function current(ctx, userId) {
  const token = await createSession(ctx, userId);
  const response = await readCurrentUser({
    request: createAuthenticatedRequest("https://test/api/auth/me", { token }),
    env: ctx.env,
  });
  assert.equal(response.status, 200);
  return (await responseJson(response)).user;
}

test("/api/auth/me exposes only the authenticated user's normalized effective permissions", async t => {
  const ctx = await setup(t);

  assert.deepEqual((await current(ctx, "admin")).permissions, []);
  assert.deepEqual((await current(ctx, "leader")).permissions, [
    ...legacyLeaderPermissions,
    "notifications.manage",
    "content.manage",
    "events.manage",
    "operations.view",
    "privacy.manage",
    "economy.manage",
    "analytics.view",
    "content.review",
  ]);
  assert.deepEqual((await current(ctx, "partial")).permissions, ["questions.review", "content.review"]);
  assert.deepEqual((await current(ctx, "participant")).permissions, []);
});

test("/api/auth/me does not duplicate permissions and preserves safe absence semantics", async t => {
  const ctx = await setup(t);
  const user = await current(ctx, "leader");
  assert.equal(new Set(user.permissions).size, user.permissions.length);
  assert.ok(Array.isArray(user.permissions));
});
