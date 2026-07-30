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
import {
  createUniversalDraft,
  transitionUniversalContentStatus,
} from "../../functions/_lib/universal-content-store.ts";
import {
  generateFreePlaySelection,
  startFreePlaySelection,
} from "../../functions/_lib/platform-free-play.ts";
import { onRequestPost as abandonGame } from "../../functions/api/platform/games/abandon.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";
import { GameMode } from "../../shared/game-modes.ts";

async function fixture(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  const token = await createSession(ctx, "player");
  const draft = await createUniversalDraft(ctx.env, "org-1", "player", {
    gameType: GameType.WORDLE,
    status: ContentStatus.DRAFT,
    metadata: {
      category: "Palavras",
      tags: ["abandono"],
      difficulty: "MEDIUM",
      biblicalReference: "João 1:1",
      status: ContentStatus.DRAFT,
      internalNotes: null,
    },
    payload: { word: "GRACA", hint: "Favor imerecido" },
  });
  assert.equal(draft.ok, true);
  const published = await transitionUniversalContentStatus(
    ctx.env,
    "org-1",
    "player",
    draft.content.id,
    ContentStatus.PUBLISHED,
    draft.content.version,
  );
  assert.equal(published.ok, true);
  const selection = await generateFreePlaySelection(ctx.env, {
    organizationId: "org-1",
    userId: "player",
  }, {
    gameType: GameType.WORDLE,
    idempotencyKey: "abandonment-test-0001",
    filters: { count: 1 },
  });
  await startFreePlaySelection(ctx.env, {
    organizationId: "org-1",
    userId: "player",
  }, selection.selectionId);
  return { ctx, token, selectionId: selection.selectionId };
}

function request(token, selectionId) {
  return createAuthenticatedRequest("https://test/api/platform/games/abandon", {
    token,
    method: "POST",
    body: {
      selectionId,
      gameType: GameType.WORDLE,
      mode: GameMode.FREE_PLAY,
    },
  });
}

test("abandonment finishes an active participation without publishing rewards", async t => {
  const { ctx, token, selectionId } = await fixture(t);
  const response = await abandonGame({ request: request(token, selectionId), env: ctx.env });
  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), {
    ok: true,
    outcome: "lost",
    duplicate: false,
  });
  const participation = ctx.raw.prepare(
    "SELECT status, finish_event_id FROM generated_game_participations WHERE selection_id=?",
  ).get(selectionId);
  assert.equal(participation.status, "FINISHED");
  assert.match(participation.finish_event_id, /^abandon:free_play:/);
  assert.equal(ctx.raw.prepare(
    "SELECT COUNT(*) total FROM core_platform_events WHERE event_type='GAME_FINISHED'",
  ).get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger").get().total, 0);
});

test("repeated abandonment is idempotent and does not create a second completion", async t => {
  const { ctx, token, selectionId } = await fixture(t);
  const first = await abandonGame({ request: request(token, selectionId), env: ctx.env });
  const second = await abandonGame({ request: request(token, selectionId), env: ctx.env });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await responseJson(second)).duplicate, true);
  assert.equal(ctx.raw.prepare(
    "SELECT COUNT(*) total FROM generated_game_participations WHERE selection_id=? AND status='FINISHED'",
  ).get(selectionId).total, 1);
});
