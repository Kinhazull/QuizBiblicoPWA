import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { importOfficialBaseContent } from "../../functions/_lib/official-base-content-importer.ts";
import { buildOfficialBaseCandidates } from "../../functions/_lib/official-base-content-importer.ts";
import { importUniversalContent } from "../../functions/_lib/universal-content-importer.ts";
import { listEligibleUniversalContent } from "../../functions/_lib/universal-eligible-content-catalog.ts";
import { generateUniversalGameSelection } from "../../functions/_lib/universal-game-generator.ts";
import { GameGenerationMode } from "../../functions/_lib/universal-game-generation-contract.ts";
import { getGameGenerationCapability } from "../../functions/_lib/universal-game-generation-capabilities.ts";

const setup = t => {
  const ctx = createTestDatabase();
  t.after(() => ctx.close());
  seedOrganization(ctx);
  seedUser(ctx, { id: "admin", role: "admin" });
  return ctx;
};

test("official base dry-run is read-only and application is resumable and idempotent", async t => {
  const ctx = setup(t);
  const dryRun = await importOfficialBaseContent(ctx.env, "org-1", "admin", false);
  assert.equal(dryRun.report.received, 380);
  assert.equal(dryRun.report.invalid, 0);
  assert.equal(dryRun.report.duplicates, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 0);

  const applied = await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  assert.equal(applied.report.migrated, 380);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items WHERE internal_notes LIKE '%Acervo Oficial v1%'").get().total, 380);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM universal_content_library WHERE availability_status='AVAILABLE'").get().total, 380);

  const replay = await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  assert.equal(replay.report.migrated, 0);
  assert.equal(replay.report.alreadyMigrated, 380);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 380);
});

test("every populated game is visible through the eligible universal catalog", async t => {
  const ctx = setup(t);
  await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  const counts = {
    "wordle-biblico": 120,
    "linha-do-tempo-biblica": 40,
    "memoria-biblica": 40,
    "associacao-de-temas": 60,
    "quem-sou-eu": 60,
    "jogo-tres-pistas": 60,
  };
  for (const [gameType, expected] of Object.entries(counts)) {
    const eligible = await listEligibleUniversalContent(ctx.env, { organizationId: "org-1", gameType, limit: 200 });
    assert.equal(eligible.length, expected, gameType);
  }
});

test("Free Play and Daily can generate a safe selection for all six official packs", async t => {
  const ctx = setup(t);
  await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  const gameTypes = [
    "wordle-biblico", "linha-do-tempo-biblica", "memoria-biblica",
    "associacao-de-temas", "quem-sou-eu", "jogo-tres-pistas",
  ];
  for (const gameType of gameTypes) {
    for (const mode of [GameGenerationMode.FREE_PLAY, GameGenerationMode.DAILY]) {
      const capability = getGameGenerationCapability(gameType);
      assert.ok(capability);
      const result = await generateUniversalGameSelection(ctx.env, {
        organizationId: "org-1",
        requestedByUserId: "admin",
        gameType,
        mode,
        selectionKey: `official-v1:${mode}:${gameType}`,
        algorithmVersion: capability.adapterVersion,
        seed: `official-v1:${mode}:${gameType}`,
        count: capability.allowedCounts[0],
      }, 100);
      assert.equal(result.ok, true, `${gameType}:${mode}`);
      assert.equal(result.selection.items.length, capability.allowedCounts[0]);
    }
  }
});

test("an interrupted batch resumes from stable identities without duplicating content", async t => {
  const ctx = setup(t);
  const candidates = buildOfficialBaseCandidates("org-1", "admin");
  const partial = await importUniversalContent(ctx.env, "admin", candidates.slice(0, 50), true, {
    source: "UNIVERSAL_CMS",
    versionIdPrefix: "official-base-v1",
    changeSummary: "Importado do Acervo Oficial v1",
    auditAction: "content.official_base_imported",
  });
  assert.equal(partial.report.migrated, 50);
  const resumed = await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  assert.equal(resumed.report.migrated, 330);
  assert.equal(resumed.report.alreadyMigrated, 50);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items").get().total, 380);
});

test("the same official package is isolated and independently idempotent per organization", async t => {
  const ctx = setup(t);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "admin-2", organizationId: "org-2", role: "admin" });
  await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  await importOfficialBaseContent(ctx.env, "org-2", "admin-2", true);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items WHERE organization_id='org-1'").get().total, 380);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_items WHERE organization_id='org-2'").get().total, 380);
});

test("official package reconciliation versions drifted runtime content without losing history", async t => {
  const ctx = setup(t);
  await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  const target = buildOfficialBaseCandidates("org-1", "admin")[0];
  ctx.raw.prepare("UPDATE content_items SET payload_json=? WHERE id=?")
    .run(JSON.stringify({ word: "ERROU", hint: "Versão antiga" }), target.model.id);

  const dryRun = await importOfficialBaseContent(ctx.env, "org-1", "admin", false);
  assert.equal(dryRun.report.updatesRequired, 1);
  assert.equal(dryRun.report.reconciled, 0);
  assert.equal(ctx.raw.prepare("SELECT version FROM content_items WHERE id=?").get(target.model.id).version, 1);

  const applied = await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  assert.equal(applied.report.updatesRequired, 1);
  assert.equal(applied.report.reconciled, 1);
  const item = ctx.raw.prepare("SELECT version,payload_json FROM content_items WHERE id=?").get(target.model.id);
  assert.equal(item.version, 2);
  assert.equal(item.payload_json, JSON.stringify(target.model.content.payload));
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM content_versions WHERE content_id=?").get(target.model.id).total, 2);
  assert.equal(ctx.raw.prepare("SELECT content_version FROM universal_content_library WHERE content_id=?").get(target.model.id).content_version, 2);

  const replay = await importOfficialBaseContent(ctx.env, "org-1", "admin", true);
  assert.equal(replay.report.updatesRequired, 0);
  assert.equal(replay.report.reconciled, 0);
});
