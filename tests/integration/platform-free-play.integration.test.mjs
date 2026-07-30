import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import {
  createUniversalDraft,
  transitionUniversalContentStatus,
} from "../../functions/_lib/universal-content-store.ts";
import {
  freePlaySelectionContext,
  generateFreePlaySelection,
  getFreePlaySelection,
  startFreePlaySelection,
} from "../../functions/_lib/platform-free-play.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";

function fixture(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "admin-1", role: "admin" });
  seedUser(ctx, { id: "user-2" });
  return ctx;
}

async function publishWordle(ctx, word) {
  const draft = await createUniversalDraft(ctx.env, "org-1", "admin-1", {
    gameType: GameType.WORDLE,
    status: ContentStatus.DRAFT,
    metadata: {
      category: "Palavras",
      tags: ["fé"],
      difficulty: "MEDIUM",
      biblicalReference: "Efésios 2:8",
      status: ContentStatus.DRAFT,
      internalNotes: null,
    },
    payload: { word, hint: "Conceito bíblico" },
  });
  assert.equal(draft.ok, true);
  const published = await transitionUniversalContentStatus(
    ctx.env,
    "org-1",
    "admin-1",
    draft.content.id,
    ContentStatus.PUBLISHED,
    draft.content.version,
  );
  assert.equal(published.ok, true);
}

test("FREE_PLAY generation is idempotent per request and creates a new selection for a new request", async t => {
  const ctx = fixture(t);
  await publishWordle(ctx, "GRACA");
  await publishWordle(ctx, "PEDRO");
  const identity = { organizationId: "org-1", userId: "admin-1" };
  const request = {
    gameType: GameType.WORDLE,
    idempotencyKey: "request-free-play-0001",
    filters: { count: 1 },
  };
  const first = await generateFreePlaySelection(ctx.env, identity, request, 100);
  const retry = await generateFreePlaySelection(ctx.env, identity, request, 101);
  const next = await generateFreePlaySelection(ctx.env, identity, {
    ...request,
    idempotencyKey: "request-free-play-0002",
  }, 102);
  assert.equal(first.selectionId, retry.selectionId);
  assert.equal(retry.reused, true);
  assert.notEqual(first.selectionId, next.selectionId);
  assert.equal(ctx.raw.prepare(
    "SELECT COUNT(*) total FROM generated_game_selections WHERE mode='FREE_PLAY'",
  ).get().total, 2);
});

test("FREE_PLAY selection is private, safe and starts usage only once", async t => {
  const ctx = fixture(t);
  await publishWordle(ctx, "GRACA");
  const identity = { organizationId: "org-1", userId: "admin-1" };
  const generated = await generateFreePlaySelection(ctx.env, identity, {
    gameType: GameType.WORDLE,
    idempotencyKey: "request-free-play-safe",
    filters: { count: 1 },
  }, 100);
  const safe = await getFreePlaySelection(ctx.env, identity, generated.selectionId);
  assert.equal(JSON.stringify(safe).includes("GRACA"), false);
  assert.equal(safe.status, "CREATED");
  await assert.rejects(
    getFreePlaySelection(ctx.env, { organizationId: "org-1", userId: "user-2" }, generated.selectionId),
    /invalid_free_play_selection/,
  );

  const started = await startFreePlaySelection(ctx.env, identity, generated.selectionId, 200);
  const retry = await startFreePlaySelection(ctx.env, identity, generated.selectionId, 201);
  assert.equal(started.participationId, retry.participationId);
  assert.equal(retry.status, "STARTED");
  assert.equal(ctx.raw.prepare(
    "SELECT usage_count FROM universal_content_library WHERE content_id=(SELECT content_id FROM generated_game_selection_items WHERE selection_id=?)",
  ).get(generated.selectionId).usage_count, 1);
  const context = await freePlaySelectionContext(
    ctx.env,
    identity,
    generated.selectionId,
    GameType.WORDLE,
    202,
  );
  assert.equal(context.selection.mode, "FREE_PLAY");
});
