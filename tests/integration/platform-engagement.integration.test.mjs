import test from "node:test";
import assert from "node:assert/strict";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser, withFrozenTime } from "../helpers/integration.mjs";
import { getPlatformAnalytics } from "../../functions/_lib/platform-analytics.ts";
import { onRequestGet as getNotifications, onRequestPost as readNotifications } from "../../functions/api/notifications.ts";
import { onRequestPost as openDaily } from "../../functions/api/platform/daily-objectives/opened.ts";

const NOW = Date.UTC(2026, 7, 9, 12);

function fixture(t) {
  const ctx = createTestDatabase(); t.after(ctx.close);
  seedOrganization(ctx, { id: "org-a" }); seedOrganization(ctx, { id: "org-b" });
  seedUser(ctx, { id: "user-a", organizationId: "org-a" }); seedUser(ctx, { id: "user-b", organizationId: "org-b" });
  ctx.raw.prepare("UPDATE organizations SET timezone='UTC'").run();
  return ctx;
}

test("DAILY_OPENED is idempotent and becomes measurable without consumers", async t => {
  const ctx = fixture(t); const token = await createSession(ctx, "user-a", { expiresAt: NOW + 3600000 });
  await withFrozenTime(NOW, async () => {
    const request = createAuthenticatedRequest("http://local/api/platform/daily-objectives/opened", { token, method: "POST" });
    const responses = await Promise.all([
      openDaily({ request, env: ctx.env }), openDaily({ request, env: ctx.env }),
    ]);
    const results = await Promise.all(responses.map(responseJson));
    assert.deepEqual(results.map(item => item.duplicate).sort(), [false, true]);
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events WHERE event_type='DAILY_OPENED'").get().total, 1);
  const analytics = await getPlatformAnalytics(ctx.env, "org-a", { key: "today", from: NOW - 1000, to: NOW + 1000 });
  assert.deepEqual(analytics.daily.opened, { available: true, users: 1, opens: 1 });
});

test("internal engagement notifications are tenant scoped and deduplicated by receipts", async t => {
  const ctx = fixture(t); const token = await createSession(ctx, "user-a", { expiresAt: NOW + 3600000 });
  ctx.raw.prepare(`INSERT INTO platform_events(id,organization_id,title,description,starts_at,ends_at,time_zone,status,completion_rule,minimum_participations,created_by,created_at,updated_at)
    VALUES('event-a','org-a','Semana Bíblica','Participe',?,?,'UTC','ACTIVE','ALL',1,'user-a',?,?)`).run(NOW - 1000, NOW + 3600000, NOW, NOW);
  ctx.raw.prepare(`INSERT INTO platform_events(id,organization_id,title,description,starts_at,ends_at,time_zone,status,completion_rule,minimum_participations,created_by,created_at,updated_at)
    VALUES('event-b','org-b','Evento secreto','Outro tenant',?,?,'UTC','ACTIVE','ALL',1,'user-b',?,?)`).run(NOW - 1000, NOW + 3600000, NOW, NOW);
  await withFrozenTime(NOW, async () => {
    const request = createAuthenticatedRequest("http://local/api/notifications", { token });
    const first = await responseJson(await getNotifications({ request, env: ctx.env }));
    assert.ok(first.notifications.some(item => item.key === "event-event-a-ending"));
    assert.equal(JSON.stringify(first).includes("Evento secreto"), false);
    const key = first.notifications.find(item => item.key.startsWith("event-event-a-")).key;
    const marked = await readNotifications({ request: createAuthenticatedRequest("http://local/api/notifications", { token, method: "POST", body: { key } }), env: ctx.env });
    assert.equal(marked.status, 200);
    const second = await responseJson(await getNotifications({ request, env: ctx.env }));
    assert.equal(second.notifications.find(item => item.key === key).read, true);
    assert.equal(second.notifications.filter(item => item.key === key).length, 1);
  });
});
