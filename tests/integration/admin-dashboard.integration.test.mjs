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
  assert.equal(data.health.partial, true); assert.equal(data.metrics.health, data.health.status === "HEALTHY" ? "healthy" : "attention");
  assert.ok(data.recommendations.some(item => item.id === "operations:pending-users" && item.severity === "ATTENTION")); assert.ok(!data.recommendations.some(item => item.id === "ai"));
  assert.deepEqual(data.events, { active: null, next: null });
  assert.deepEqual(data.reservations, { active: 0, expired: 0 });
  assert.equal(data.usage.activeUsers, 0); assert.equal(data.content.needsReview, 0);
});

test("dashboard exposes operational attention safely and rejects participants", async t => {
  const { ctx } = await setup(t), adminToken = await createSession(ctx, "admin", { token: "admin-two" }), participantToken = await createSession(ctx, "participant", { token: "participant-token" });
  const allowed = await dashboard({ request: createAuthenticatedRequest("https://test/api/admin/dashboard", { token: adminToken }), env: { ...ctx.env, AI: { run: async () => ({}) } } });
  const data = await responseJson(allowed); assert.equal(data.metrics.pending, 0); assert.ok(data.recommendations.every(item => !Object.hasOwn(item, "userId")));
  const denied = await dashboard({ request: createAuthenticatedRequest("https://test/api/admin/dashboard", { token: participantToken }), env: ctx.env }); assert.equal(denied.status, 403);
});

test("dashboard returns only tenant-scoped event and recent activity summaries", async t => {
  const { ctx, token } = await setup(t), now = Date.now();
  const insert = ctx.raw.prepare(`INSERT INTO platform_events(id,organization_id,title,description,starts_at,ends_at,time_zone,status,completion_rule,minimum_participations,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  insert.run("event-active", "org-1", "Evento ativo", "", now - 1000, now + 60000, "America/Sao_Paulo", "ACTIVE", "ALL", 1, "admin", now, now);
  insert.run("event-next", "org-1", "Próximo evento", "", now + 120000, now + 180000, "America/Sao_Paulo", "SCHEDULED", "ALL", 1, "admin", now, now);
  insert.run("event-other", "org-2", "Evento alheio", "", now - 1000, now + 60000, "America/Sao_Paulo", "ACTIVE", "ALL", 1, "admin", now, now);
  ctx.raw.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,created_at) VALUES(?,?,?,?,?,?,?)").run("audit-1", "org-1", "admin", "content.published", "content", "secret-id", now);
  ctx.raw.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,created_at) VALUES(?,?,?,?,?,?,?)").run("audit-2", "org-2", null, "other.action", "other", "other-id", now);
  const data = await responseJson(await dashboard({ request: createAuthenticatedRequest("https://test/api/admin/dashboard", { token }), env: ctx.env }));
  assert.equal(data.events.active.title, "Evento ativo"); assert.equal(data.events.next.title, "Próximo evento");
  assert.deepEqual(data.recent, [{ action: "content.published", entityType: "content", createdAt: now }]);
  assert.ok(!JSON.stringify(data).includes("secret-id")); assert.ok(!JSON.stringify(data).includes("Evento alheio"));
  assert.ok(data.recommendations.every(item => item.entity?.id !== "event-other"));
});
