import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, seedOrganization, seedUser, createSession, createAuthenticatedRequest, responseJson } from "../helpers/integration.mjs";
import { onRequestGet as dashboard } from "../../functions/api/admin/dashboard.ts";

async function setup(t) { const ctx = createTestDatabase(); t.after(ctx.close); seedOrganization(ctx); seedOrganization(ctx, { id: "org-2" }); seedUser(ctx, { id: "admin", role: "admin" }); seedUser(ctx, { id: "participant" }); const token = await createSession(ctx, "admin"); return { ctx, token }; }

test("dashboard returns real organization-scoped metrics and attention", async t => {
  const { ctx, token } = await setup(t);
  seedUser(ctx, { id: "pending", status: "pending" }); seedUser(ctx, { id: "other-pending", organizationId: "org-2", status: "pending" });
  const response = await dashboard({ request: createAuthenticatedRequest("https://test/api/admin/dashboard", { token }), env: ctx.env });
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store, private");
  const data = await responseJson(response); assert.equal(data.metrics.pending, 1); assert.equal(data.metrics.members, 2);
  assert.ok(data.attention.some(item => item.id === "users" && item.count === 1)); assert.ok(!data.attention.some(item => item.id === "ai"));
});

test("dashboard has a valid empty critical state and rejects participants", async t => {
  const { ctx } = await setup(t), adminToken = await createSession(ctx, "admin", { token: "admin-two" }), participantToken = await createSession(ctx, "participant", { token: "participant-token" });
  const allowed = await dashboard({ request: createAuthenticatedRequest("https://test/api/admin/dashboard", { token: adminToken }), env: { ...ctx.env, AI: { run: async () => ({}) } } });
  const data = await responseJson(allowed); assert.equal(data.metrics.pending, 0); assert.equal(data.attention.length, 0);
  const denied = await dashboard({ request: createAuthenticatedRequest("https://test/api/admin/dashboard", { token: participantToken }), env: ctx.env }); assert.equal(denied.status, 403);
});
