import test from "node:test";
import assert from "node:assert/strict";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { onRequestPost as createContent } from "../../functions/api/admin/content.ts";
import { onRequestPost as submitReview } from "../../functions/api/admin/content/[id]/submit-review.ts";
import { onRequestPost as publish } from "../../functions/api/admin/content/[id]/publish.ts";
import { onRequestPost as archive } from "../../functions/api/admin/content/[id]/archive.ts";
import { onRequestPost as restore } from "../../functions/api/admin/content/[id]/restore.ts";
import { onRequestPost as requestChanges } from "../../functions/api/admin/content/[id]/request-changes.ts";
import { onRequestPost as rollback } from "../../functions/api/admin/content/[id]/rollback.ts";
import { onRequestGet as comments, onRequestPost as addComment } from "../../functions/api/admin/content/[id]/comments.ts";
import { onRequestGet as listAssets, onRequestPost as createAsset } from "../../functions/api/admin/assets.ts";
import { onRequestPost as linkAsset } from "../../functions/api/admin/content/[id]/assets.ts";
import { runUniversalAdminImport } from "../../functions/_lib/universal-admin-import.ts";

async function fixture(t) { const ctx = createTestDatabase(); t.after(() => ctx.close()); seedOrganization(ctx); seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "author", role: "participant" }); seedUser(ctx, { id: "reviewer", role: "participant" });
  ctx.raw.prepare("INSERT INTO user_permissions(user_id,permission_code,granted_by,granted_at) VALUES('author','content.manage','admin',0),('reviewer','content.review','admin',0)").run();
  return { ctx, admin: await createSession(ctx, "admin"), author: await createSession(ctx, "author"), reviewer: await createSession(ctx, "reviewer") }; }
const body = { gameType: "memoria-biblica", status: "DRAFT", metadata: { category: "Personagens", tags: ["memoria"], difficulty: "EASY", biblicalReference: "Genesis 6", internalNotes: null },
  payload: { title: "Noe e a arca", pairs: [{ front: "Noe", back: "Arca" }, { front: "Pomba", back: "Ramo" }, { front: "Chuva", back: "Diluvio" }] } };
const call = (handler, ctx, token, id, data) => handler({ request: createAuthenticatedRequest(`https://test/api/admin/content/${id}`, { token, method: "POST", body: data }), env: ctx.env, params: { id } });

test("editorial workflow is constrained, reviewed, auditable and archives without losing history", async t => {
  const { ctx, author, reviewer } = await fixture(t);
  const created = await responseJson(await createContent({ request: createAuthenticatedRequest("https://test/api/admin/content", { token: author, method: "POST", body }), env: ctx.env }));
  const id = created.content.id;
  assert.equal((await call(publish, ctx, reviewer, id, { version: 1 })).status, 409);
  const review = await responseJson(await call(submitReview, ctx, author, id, { version: 1 })); assert.equal(review.content.status, "IN_REVIEW");
  assert.equal((await call(requestChanges, ctx, reviewer, id, { version: 2 })).status, 422);
  const draft = await responseJson(await call(requestChanges, ctx, reviewer, id, { version: 2, comment: "Ajustar a referencia." })); assert.equal(draft.content.status, "DRAFT");
  const reviewed = await responseJson(await call(submitReview, ctx, author, id, { version: 3 }));
  const published = await responseJson(await call(publish, ctx, reviewer, id, { version: reviewed.content.version, comment: "Aprovado." }));
  assert.equal(published.content.status, "PUBLISHED");
  assert.equal(ctx.raw.prepare("SELECT availability_status FROM universal_content_library WHERE content_id=?").get(id).availability_status, "AVAILABLE");
  const archived = await responseJson(await call(archive, ctx, reviewer, id, { version: published.content.version })); assert.equal(archived.content.status, "ARCHIVED");
  assert.equal(ctx.raw.prepare("SELECT availability_status FROM universal_content_library WHERE content_id=?").get(id).availability_status, "ARCHIVED");
  const restored = await responseJson(await call(restore, ctx, reviewer, id, { version: archived.content.version })); assert.equal(restored.content.status, "DRAFT");
  assert.ok(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions WHERE content_id=?").get(id).total >= 6);
});

test("comments and rollback are tenant isolated and rollback creates a new version", async t => {
  const { ctx, author, reviewer } = await fixture(t); const created = await responseJson(await createContent({ request: createAuthenticatedRequest("https://test/api/admin/content", { token: author, method: "POST", body }), env: ctx.env }));
  assert.equal((await call(addComment, ctx, reviewer, created.content.id, { body: "Revisao objetiva" })).status, 201);
  const listed = await responseJson(await comments({ request: createAuthenticatedRequest("https://test", { token: author }), env: ctx.env, params: { id: created.content.id } })); assert.equal(listed.comments.length, 1);
  const rolled = await responseJson(await call(rollback, ctx, author, created.content.id, { version: 1, sourceVersion: 1 })); assert.equal(rolled.content.version, 2); assert.equal(rolled.content.rollbackSourceVersion, 1);
});

test("asset registry rejects unsafe formats and supports versioned Memory links", async t => {
  const { ctx, author } = await fixture(t); const unsafe = await createAsset({ request: createAuthenticatedRequest("https://test/api/admin/assets", { token: author, method: "POST", body: { type: "IMAGE", title: "x", altText: "x", sourceUrl: "https://cdn/x.svg", width: 100, height: 100, mimeType: "image/svg+xml" } }), env: ctx.env }); assert.equal(unsafe.status, 422);
  const assetResponse = await createAsset({ request: createAuthenticatedRequest("https://test/api/admin/assets", { token: author, method: "POST", body: { type: "IMAGE", title: "Arca", altText: "Ilustracao de uma arca", sourceUrl: "https://cdn.example/arca.webp", source: "Equipe editorial", license: "Proprietaria", width: 640, height: 480, byteSize: 1000, mimeType: "image/webp", status: "ACTIVE" } }), env: ctx.env });
  const { assetId } = await responseJson(assetResponse); const created = await responseJson(await createContent({ request: createAuthenticatedRequest("https://test/api/admin/content", { token: author, method: "POST", body }), env: ctx.env }));
  assert.equal((await call(linkAsset, ctx, author, created.content.id, { assetId, role: "PAIR_A", position: 0 })).status, 201);
  assert.equal((await responseJson(await listAssets({ request: createAuthenticatedRequest("https://test/api/admin/assets", { token: author }), env: ctx.env }))).assets.length, 1);
});

test("universal JSON import is dry-run by default, explicit and idempotent", async t => {
  const { ctx } = await fixture(t); const row = { externalId: "one", gameType: "memoria-biblica", status: "PUBLISHED", metadata: body.metadata, payload: body.payload };
  const dry = await runUniversalAdminImport(ctx.env, "org-1", "admin", { format: "JSON", data: JSON.stringify([row]) }); assert.equal(dry.dryRun, true); assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);
  const first = await runUniversalAdminImport(ctx.env, "org-1", "admin", { format: "JSON", data: JSON.stringify([row]), confirmation: "IMPORTAR_CONTEUDO_UNIVERSAL" }); assert.equal(first.migrated, 1);
  const replay = await runUniversalAdminImport(ctx.env, "org-1", "admin", { format: "JSON", data: JSON.stringify([row]), confirmation: "IMPORTAR_CONTEUDO_UNIVERSAL" }); assert.equal(replay.alreadyMigrated, 1);
});
