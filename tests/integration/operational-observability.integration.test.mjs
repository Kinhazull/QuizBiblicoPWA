import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet as readHealth } from "../../functions/api/admin/health.ts";
import { operationalLog, publicError, PublicErrorCategory } from "../../functions/_lib/operational-observability.ts";
import { OPERATIONAL_THRESHOLDS } from "../../shared/operational-thresholds.mjs";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";

test("unexpected public errors expose only a stable contract and correlate the structured log", async () => {
  const lines = [], previous = console.error;
  console.error = line => lines.push(JSON.parse(line));
  let response;
  try {
    response = publicError(new Error("SQLITE_CONSTRAINT: password token payload"), {
      category: PublicErrorCategory.INTERNAL_ERROR,
      code: "operation_failed",
      component: "test-component",
      operation: "test-operation",
    });
  } finally { console.error = previous; }
  const body = await responseJson(response);
  assert.equal(response.status, 500);
  assert.equal(body.error, "operation_failed");
  assert.equal(body.category, "INTERNAL_ERROR");
  assert.match(body.supportId, /^SUP-/);
  assert.equal(lines[0].supportId, body.supportId);
  assert.equal(JSON.stringify(body).includes("SQLITE"), false);
  assert.equal(JSON.stringify(lines).includes("password"), false);
});

test("structured logging drops prohibited fields even when an untyped caller supplies them", () => {
  const lines = [], previous = console.log;
  console.log = line => lines.push(JSON.parse(line));
  try { operationalLog({ level: "info", operation: "safe", component: "test", outcome: "completed", email: "private@example.com", payload: { answer: "secret" } }); }
  finally { console.log = previous; }
  assert.equal(lines[0].email, undefined);
  assert.equal(lines[0].payload, undefined);
});

test("admin health is read-only, organization-scoped and exposes unified operational groups", async t => {
  const ctx = createTestDatabase(); t.after(ctx.close);
  seedOrganization(ctx); seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "other-admin", role: "admin", organizationId: "org-2" });
  seedUser(ctx, { id: "participant" });
  const adminToken = await createSession(ctx, "admin");
  const otherToken = await createSession(ctx, "other-admin");
  const participantToken = await createSession(ctx, "participant");
  ctx.raw.prepare(`INSERT INTO quiz_core_event_outbox(event_id,event_type,event_version,organization_id,user_id,game_id,source_type,source_id,payload_json,envelope_json,delivery_state,attempt_count,created_at,updated_at) VALUES('health-event','GAME_FINISHED',2,'org-1','participant','quiz-biblico','attempt','health-attempt','{}','{}','dead_letter',1,1,1)`).run();
  const before = ctx.raw.prepare("SELECT COUNT(*) total FROM quiz_core_event_outbox").get().total;
  const response = await readHealth({ request: createAuthenticatedRequest("https://test/api/admin/health", { token: adminToken }), env: ctx.env });
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.match(data.operational.status, /^(HEALTHY|DEGRADED|CRITICAL|UNKNOWN)$/);
  assert.deepEqual(Object.keys(data.operational.groups).sort(), ["CMS", "DATABASE", "ECONOMY", "EVENTS", "EVENT_ENGINE", "GENERATOR", "MIGRATIONS", "OUTBOX", "PRIVACY", "UNIVERSAL_LIBRARY", "WORKER"].sort());
  assert.equal(data.operational.groups.OUTBOX.checks.find(item => item.code === "outbox.dead_letters").value, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM quiz_core_event_outbox").get().total, before);
  const other = await responseJson(await readHealth({ request: createAuthenticatedRequest("https://test/api/admin/health", { token: otherToken }), env: ctx.env }));
  assert.equal(other.operational.groups.OUTBOX.checks.find(item => item.code === "outbox.dead_letters").value, 0);
  assert.equal((await readHealth({ request: createAuthenticatedRequest("https://test/api/admin/health", { token: participantToken }), env: ctx.env })).status, 403);
});

test("operational thresholds have one immutable shared source", () => {
  assert.equal(Object.isFrozen(OPERATIONAL_THRESHOLDS), true);
  assert.ok(OPERATIONAL_THRESHOLDS.outbox.degradedCount < OPERATIONAL_THRESHOLDS.outbox.criticalCount);
  assert.ok(OPERATIONAL_THRESHOLDS.outbox.degradedAgeMs < OPERATIONAL_THRESHOLDS.outbox.criticalAgeMs);
});

