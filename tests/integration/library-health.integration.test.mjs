import assert from "node:assert/strict";
import test from "node:test";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { onRequestGet } from "../../functions/api/admin/content/library-health.ts";

function insertContent(ctx, { organizationId, id, gameType = "wordle-biblico", category = "Personagens", difficulty = "EASY", status = "PUBLISHED", projected = true, usage = 0 }) {
  ctx.raw.prepare(`INSERT INTO content_items(id,organization_id,game_type,status,category,difficulty,tags_json,payload_json,version,author_id,created_at,updated_at)
    VALUES(?,?,?,?,?,?, '[]','{}',1,?,1000,1000)`).run(id, organizationId, gameType, status, category, difficulty, `admin-${organizationId}`);
  if (projected) ctx.raw.prepare(`INSERT INTO universal_content_library(organization_id,content_id,game_type,content_version,difficulty,themes_json,books_json,tags_json,usage_count,first_published_at,availability_status,created_at,updated_at)
    VALUES(?,?,?,1,?,'[]','[]','[]',?,1000,'AVAILABLE',1000,1000)`).run(organizationId, id, gameType, difficulty, usage);
}

test("library health endpoint is read-only, permission-gated and tenant isolated", async t => {
  const ctx = createTestDatabase(); t.after(ctx.close);
  seedOrganization(ctx, { id: "org-1" }); seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "admin-org-1", organizationId: "org-1", role: "admin" });
  seedUser(ctx, { id: "admin-org-2", organizationId: "org-2", role: "admin" });
  seedUser(ctx, { id: "participant", organizationId: "org-1" });
  insertContent(ctx, { organizationId: "org-1", id: "org-1-unprojected", projected: false });
  insertContent(ctx, { organizationId: "org-2", id: "org-2-unprojected", projected: false });
  const token = await createSession(ctx, "admin-org-1");
  const before = ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total;
  const response = await onRequestGet({ request: createAuthenticatedRequest("http://local/api/admin/content/library-health", { token }), env: ctx.env });
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store, private");
  const data = await responseJson(response);
  assert.equal(data.insights.find(item => item.rule === "published_without_projection").count, 1);
  assert.ok(!JSON.stringify(data).includes("org-2-unprojected"));
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, before);
  const participantToken = await createSession(ctx, "participant");
  assert.equal((await onRequestGet({ request: createAuthenticatedRequest("http://local/api/admin/content/library-health", { token: participantToken }), env: ctx.env })).status, 403);
});
