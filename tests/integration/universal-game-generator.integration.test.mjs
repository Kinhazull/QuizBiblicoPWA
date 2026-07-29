import test from "node:test";
import assert from "node:assert/strict";
import {
  createTestDatabase,
  seedOrganization,
  seedUser,
} from "../helpers/integration.mjs";
import {
  createUniversalDraft,
  transitionUniversalContentStatus,
  updateUniversalDraft,
} from "../../functions/_lib/universal-content-store.ts";
import {
  generateUniversalGameSelection,
} from "../../functions/_lib/universal-game-generator.ts";
import {
  GameGenerationMode,
} from "../../functions/_lib/universal-game-generation-contract.ts";
import {
  resolveWordlePilotSelection,
} from "../../functions/_lib/game-integrations/wordle-generation-adapter.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";

function input(word, {
  category = "Conceitos",
  difficulty = "MEDIUM",
  tags = ["fé"],
  biblicalReference = "Efésios 2:8",
  hint = "Favor imerecido",
} = {}) {
  return {
    gameType: GameType.WORDLE,
    status: ContentStatus.DRAFT,
    metadata: {
      category,
      tags,
      difficulty,
      biblicalReference,
      status: ContentStatus.DRAFT,
      internalNotes: null,
    },
    payload: { word, hint },
  };
}

function fixture(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "admin-1", role: "admin" });
  seedUser(ctx, { id: "admin-2", organizationId: "org-2", role: "admin" });
  return ctx;
}

async function publish(ctx, word, options = {}, organizationId = "org-1", actorId = "admin-1") {
  const draft = await createUniversalDraft(ctx.env, organizationId, actorId, input(word, options));
  assert.equal(draft.ok, true);
  const published = await transitionUniversalContentStatus(
    ctx.env,
    organizationId,
    actorId,
    draft.content.id,
    ContentStatus.PUBLISHED,
    draft.content.version,
  );
  assert.equal(published.ok, true);
  return published.content;
}

function generationRequest(overrides = {}) {
  return {
    organizationId: "org-1",
    requestedByUserId: "admin-1",
    gameType: GameType.WORDLE,
    mode: GameGenerationMode.INTERNAL_TEST,
    selectionKey: "wordle-pilot",
    algorithmVersion: 1,
    seed: "wordle-pilot-seed",
    count: 1,
    ...overrides,
  };
}

test("Wordle pilot persists an immutable safe selection and does not count generation as usage", async t => {
  const ctx = fixture(t);
  const content = await publish(ctx, "GRACA");
  const generated = await generateUniversalGameSelection(ctx.env, generationRequest(), 100);
  assert.equal(generated.ok, true);
  assert.equal(generated.reused, false);
  assert.equal(generated.selection.items.length, 1);
  assert.equal(generated.selection.items[0].contentId, content.id);
  assert.equal(generated.selection.items[0].contentVersion, content.version);
  assert.equal(ctx.raw.prepare(
    "SELECT usage_count FROM universal_content_library WHERE content_id=?",
  ).get(content.id).usage_count, 0);

  const resolved = await resolveWordlePilotSelection(
    ctx.env,
    "org-1",
    generated.selection.id,
    101,
  );
  assert.equal(resolved.content.id, content.id);
  assert.equal(resolved.content.wordLength, 5);
  assert.equal(resolved.content.hint, "Favor imerecido");
  assert.equal(JSON.stringify(resolved).includes("GRACA"), false);
  assert.equal("word" in resolved.content, false);
});

test("equivalent requests are idempotent and concurrent generation persists one selection", async t => {
  const ctx = fixture(t);
  await publish(ctx, "PEDRO");
  const [first, second] = await Promise.all([
    generateUniversalGameSelection(ctx.env, generationRequest(), 100),
    generateUniversalGameSelection(ctx.env, generationRequest(), 100),
  ]);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.selection.id, second.selection.id);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selections").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selection_items").get().total, 1);
});

test("same logical key with incompatible filters fails safely", async t => {
  const ctx = fixture(t);
  await publish(ctx, "PAULO", { difficulty: "EASY" });
  const first = await generateUniversalGameSelection(ctx.env, generationRequest({
    difficulty: "EASY",
  }));
  assert.equal(first.ok, true);
  const conflict = await generateUniversalGameSelection(ctx.env, generationRequest({
    difficulty: "HARD",
  }));
  assert.equal(conflict.ok, false);
  assert.equal(conflict.error.code, "selection_key_conflict");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selections").get().total, 1);
});

test("organization isolation and reserved content are enforced only by the eligible catalog", async t => {
  const ctx = fixture(t);
  await publish(ctx, "DAVID", {}, "org-2", "admin-2");
  const unavailable = await generateUniversalGameSelection(ctx.env, generationRequest());
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.error.code, "insufficient_eligible_content");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selections").get().total, 0);

  const own = await publish(ctx, "JESUS");
  ctx.raw.prepare(`UPDATE universal_content_library SET availability_status='RESERVED_EVENT'
    WHERE organization_id='org-1' AND content_id=?`).run(own.id);
  const reserved = await generateUniversalGameSelection(ctx.env, generationRequest());
  assert.equal(reserved.ok, false);
  assert.equal(reserved.error.code, "insufficient_eligible_content");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selections").get().total, 0);
});

test("selection pins contentVersion when CMS publishes a newer Wordle", async t => {
  const ctx = fixture(t);
  const original = await publish(ctx, "GRACA");
  const generated = await generateUniversalGameSelection(ctx.env, generationRequest(), 100);
  assert.equal(generated.ok, true);
  const draft = await transitionUniversalContentStatus(
    ctx.env,
    "org-1",
    "admin-1",
    original.id,
    ContentStatus.DRAFT,
    original.version,
  );
  assert.equal(draft.ok, true);
  const updated = await updateUniversalDraft(
    ctx.env,
    "org-1",
    "admin-1",
    original.id,
    {
      ...input("PEDRO", { hint: "Discípulo de Jesus" }),
      version: draft.content.version,
    },
  );
  assert.equal(updated.ok, true);
  const republished = await transitionUniversalContentStatus(
    ctx.env,
    "org-1",
    "admin-1",
    original.id,
    ContentStatus.PUBLISHED,
    updated.content.version,
  );
  assert.equal(republished.ok, true);
  assert.notEqual(republished.content.version, original.version);

  const resolved = await resolveWordlePilotSelection(
    ctx.env,
    "org-1",
    generated.selection.id,
    101,
  );
  assert.equal(resolved.content.version, original.version);
  assert.equal(resolved.content.hint, "Favor imerecido");
  assert.equal("word" in resolved.content, false);
});

test("Wordle pilot rejects cross-organization and expired selection resolution", async t => {
  const ctx = fixture(t);
  await publish(ctx, "NOEMI");
  const generated = await generateUniversalGameSelection(ctx.env, generationRequest({
    expiresAt: 200,
  }), 100);
  assert.equal(generated.ok, true);
  assert.equal(await resolveWordlePilotSelection(
    ctx.env,
    "org-2",
    generated.selection.id,
    101,
  ), null);
  assert.equal(await resolveWordlePilotSelection(
    ctx.env,
    "org-1",
    generated.selection.id,
    200,
  ), null);
});

test("generation rejects a requesting user from another organization and past expiration", async t => {
  const ctx = fixture(t);
  await publish(ctx, "SARAI");
  const wrongUser = await generateUniversalGameSelection(ctx.env, generationRequest({
    requestedByUserId: "admin-2",
  }), 100);
  assert.equal(wrongUser.ok, false);
  assert.deepEqual(wrongUser.error.details, ["requestedByUserId"]);
  const expired = await generateUniversalGameSelection(ctx.env, generationRequest({
    expiresAt: 99,
  }), 100);
  assert.equal(expired.ok, false);
  assert.deepEqual(expired.error.details, ["expiresAt"]);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selections").get().total, 0);
});
