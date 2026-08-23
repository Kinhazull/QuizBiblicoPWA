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
import { onRequestPost as finishPlatformGame } from "../../functions/api/platform/games/finish.ts";
import {
  createUniversalDraft,
  transitionUniversalContentStatus,
} from "../../functions/_lib/universal-content-store.ts";
import {
  freePlaySelectionContext,
  generateFreePlaySelection,
  getFreePlaySelection,
  startFreePlaySelection,
  validateFreePlayAction,
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

async function publishMemory(ctx, index) {
  const draft = await createUniversalDraft(ctx.env, "org-1", "admin-1", {
    gameType: GameType.MEMORY,
    status: ContentStatus.DRAFT,
    metadata: {
      category: "Pares",
      tags: ["memória"],
      difficulty: "MEDIUM",
      biblicalReference: `Referência ${index}`,
      status: ContentStatus.DRAFT,
      internalNotes: null,
    },
    payload: { title: `Conjunto ${index}`, pairs: [
      { front: `Frente ${index}A`, back: `Verso ${index}A` },
      { front: `Frente ${index}B`, back: `Verso ${index}B` },
      { front: `Frente ${index}C`, back: `Verso ${index}C` },
    ] },
  });
  assert.equal(draft.ok, true);
  const published = await transitionUniversalContentStatus(
    ctx.env, "org-1", "admin-1", draft.content.id, ContentStatus.PUBLISHED, draft.content.version,
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

test("FREE_PLAY Memory persists a three-source composition and reuses it idempotently", async t => {
  const ctx = fixture(t);
  for (let index = 1; index <= 6; index += 1) await publishMemory(ctx, index);
  const identity = { organizationId: "org-1", userId: "admin-1" };
  const request = {
    gameType: GameType.MEMORY,
    idempotencyKey: "memory-free-play-0001",
    filters: { count: 3 },
  };
  const generated = await generateFreePlaySelection(ctx.env, identity, request, 100);
  const retry = await generateFreePlaySelection(ctx.env, identity, request, 101);
  assert.equal(generated.selectionId, retry.selectionId);
  assert.equal(retry.reused, true);
  assert.equal(ctx.raw.prepare(
    "SELECT COUNT(*) total FROM generated_game_selection_items WHERE selection_id=?",
  ).get(generated.selectionId).total, 3);
  const safe = await getFreePlaySelection(ctx.env, identity, generated.selectionId);
  assert.equal(safe.content.pairCount, 3);
  assert.equal(safe.content.cards.length, 6);
  assert.equal(new Set(safe.content.cards.map(card => card.id)).size, 6);
  await startFreePlaySelection(ctx.env, identity, generated.selectionId, 200);
  assert.equal(ctx.raw.prepare(
    "SELECT SUM(usage_count) total FROM universal_content_library WHERE game_type=?",
  ).get(GameType.MEMORY).total, 3);

  const matchingCards = [];
  for (let left = 0; left < safe.content.cards.length; left += 1) {
    for (let right = left + 1; right < safe.content.cards.length; right += 1) {
      const cardIds = [safe.content.cards[left].id, safe.content.cards[right].id];
      const validation = await validateFreePlayAction(ctx.env, identity, {
        selectionId: generated.selectionId,
        gameType: GameType.MEMORY,
        action: "validate_pair",
        payload: { cardIds },
      }, 201);
      if (validation.match) matchingCards.push(cardIds);
    }
  }
  assert.equal(matchingCards.length, 3);
  const token = await createSession(ctx, "admin-1");
  const response = await finishPlatformGame({
    request: createAuthenticatedRequest("https://test/api/platform/games/finish", {
      token,
      method: "POST",
      body: {
        gameId: GameType.MEMORY,
        sessionId: "memory-dynamic-free-play-finish",
        contentId: safe.content.id,
        contentVersion: safe.content.version,
        freePlaySelectionId: generated.selectionId,
        revealedCardIds: matchingCards.flat(),
      },
    }),
    env: ctx.env,
  });
  const completion = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(completion.outcome, "won");
  assert.equal(ctx.raw.prepare(
    "SELECT sessions_completed total FROM user_platform_game_statistics WHERE user_id=? AND game_id=?",
  ).get("admin-1", GameType.MEMORY).total, 1);
});
