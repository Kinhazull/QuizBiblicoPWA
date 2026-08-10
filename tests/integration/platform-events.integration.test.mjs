import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { createUniversalDraft, transitionUniversalContentStatus } from "../../functions/_lib/universal-content-store.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";
import {
  cancelPlatformEvent, createPlatformEvent, getEventSelection, getParticipantEvent,
  listEventContentOptions, reconcileFinishedEvents, reconcilePlatformEvents, schedulePlatformEvent, startEventSelection, validatePlatformEvent,
} from "../../functions/_lib/platform-events.ts";
import { generateFreePlaySelection } from "../../functions/_lib/platform-free-play.ts";
import { getDailyObjective } from "../../functions/_lib/platform-daily-objectives.ts";

async function fixture(t) {
  const ctx = createTestDatabase(); t.after(ctx.close); seedOrganization(ctx); seedUser(ctx, { id: "admin", role: "admin" }); seedUser(ctx, { id: "player" });
  const draft = await createUniversalDraft(ctx.env, "org-1", "admin", { gameType: GameType.WORDLE, status: ContentStatus.DRAFT,
    metadata: { category: "Palavras", tags: ["fé"], difficulty: "MEDIUM", biblicalReference: "Efésios 2:8", status: ContentStatus.DRAFT, internalNotes: null },
    payload: { word: "GRACA", hint: "Favor imerecido" } });
  const published = await transitionUniversalContentStatus(ctx.env, "org-1", "admin", draft.content.id, ContentStatus.PUBLISHED, draft.content.version);
  return { ctx, contentId: draft.content.id, version: published.content.version };
}

const input = (contentId, version) => ({ title: "Evento da Comunidade", description: "Desafio especial", startsAt: 1_000, endsAt: 10_000,
  timeZone: "America/Sao_Paulo", participationXp: 20, victoryCoins: 2, completionBonusXp: 10, perfectBonusCoins: 1,
  games: [{ gameType: GameType.WORDLE, contentItems: [{ contentId, contentVersion: version }] }] });

test("editor lista somente conteúdo elegível da organização com metadados seguros", async t => {
  const { ctx, contentId, version } = await fixture(t);
  seedOrganization(ctx, { id: "org-2", name: "Organização 2" });
  const result = await listEventContentOptions(ctx.env, "org-1", { gameType: GameType.WORDLE, search: "palavras" });
  assert.equal(result.options.length, 1);
  assert.deepEqual(result.options[0], {
    contentId, contentVersion: version, gameType: GameType.WORDLE, difficulty: "MEDIUM", themes: ["Palavras"], tags: ["fé"],
    title: "Palavras", category: "Palavras", biblicalReference: "Efésios 2:8",
  });
  assert.deepEqual(result.counts, { available: 1, reserved: 0, archived: 0 });
  assert.deepEqual(await listEventContentOptions(ctx.env, "org-2", { gameType: GameType.WORDLE }), { options: [], counts: { available: 0, reserved: 0, archived: 0 } });
});

test("evento valida, agenda seleção imutável e reserva conteúdo", async t => {
  const { ctx, contentId, version } = await fixture(t); const identity = { organizationId: "org-1", userId: "admin" };
  const event = await createPlatformEvent(ctx.env, identity, input(contentId, version), 100);
  assert.deepEqual(await validatePlatformEvent(ctx.env, "org-1", event.id), { valid: true, errors: [] });
  const scheduled = await schedulePlatformEvent(ctx.env, identity, event.id, 200);
  assert.equal(scheduled.scheduled, true);
  assert.equal(ctx.raw.prepare("SELECT availability_status status FROM universal_content_library WHERE content_id=?").get(contentId).status, "RESERVED_EVENT");
  assert.equal(ctx.raw.prepare("SELECT mode FROM generated_game_selections WHERE selection_key=?").get(`event:${event.id}:${GameType.WORDLE}`).mode, "EVENT");
  await assert.rejects(() => schedulePlatformEvent(ctx.env, identity, event.id, 201), /invalid_event_transition/);
});

test("participação é isolada, inicia uma vez e o payload não revela a resposta", async t => {
  const { ctx, contentId, version } = await fixture(t); const admin = { organizationId: "org-1", userId: "admin" }; const player = { organizationId: "org-1", userId: "player" };
  const event = await createPlatformEvent(ctx.env, admin, input(contentId, version), 100); await schedulePlatformEvent(ctx.env, admin, event.id, 200);
  const detail = await getParticipantEvent(ctx.env, player, event.id, 2_000); const game = detail.games[0];
  const first = await startEventSelection(ctx.env, player, event.id, game.selectionId, 2_000); const retry = await startEventSelection(ctx.env, player, event.id, game.selectionId, 2_001);
  assert.equal(first.participationId, retry.participationId);
  const payload = await getEventSelection(ctx.env, player, event.id, game.selectionId, 2_002);
  assert.equal(JSON.stringify(payload).includes("GRACA"), false);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_event_participations").get().total, 1);
});

test("cancelamento libera reservas e preserva auditoria", async t => {
  const { ctx, contentId, version } = await fixture(t); const identity = { organizationId: "org-1", userId: "admin" };
  const event = await createPlatformEvent(ctx.env, identity, input(contentId, version), 100); await schedulePlatformEvent(ctx.env, identity, event.id, 200); await cancelPlatformEvent(ctx.env, identity, event.id, 300);
  assert.equal(ctx.raw.prepare("SELECT availability_status status FROM universal_content_library WHERE content_id=?").get(contentId).status, "AVAILABLE");
  assert.equal(ctx.raw.prepare("SELECT released_at value FROM platform_event_content_reservations WHERE event_id=?").get(event.id).value, 300);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM audit_logs WHERE entity_id=? AND action='platform_event.cancelled'").get(event.id).total, 1);
});

test("reservas concorrentes são bloqueadas e o encerramento libera o conteúdo", async t => {
  const { ctx, contentId, version } = await fixture(t); const identity = { organizationId: "org-1", userId: "admin" };
  const first = await createPlatformEvent(ctx.env, identity, input(contentId, version), 100);
  const second = await createPlatformEvent(ctx.env, identity, { ...input(contentId, version), title: "Evento concorrente" }, 101);
  await schedulePlatformEvent(ctx.env, identity, first.id, 200);
  assert.equal((await validatePlatformEvent(ctx.env, "org-1", second.id, 201)).valid, false);
  assert.equal((await schedulePlatformEvent(ctx.env, identity, second.id, 202)).scheduled, false);
  const result = await reconcileFinishedEvents(ctx.env, "org-1", 10_001);
  assert.equal(result.finished, 1);
  assert.equal(ctx.raw.prepare("SELECT status FROM platform_events WHERE id=?").get(first.id).status, "FINISHED");
  assert.equal(ctx.raw.prepare("SELECT availability_status status FROM universal_content_library WHERE content_id=?").get(contentId).status, "AVAILABLE");
});

test("reconciliação operacional encerra Eventos sem depender de tráfego autenticado", async t => {
  const { ctx, contentId, version } = await fixture(t); const identity = { organizationId: "org-1", userId: "admin" };
  const event = await createPlatformEvent(ctx.env, identity, input(contentId, version), 100);
  await schedulePlatformEvent(ctx.env, identity, event.id, 200);
  const result = await reconcilePlatformEvents(ctx.env, 10_001, 100);
  assert.deepEqual(result, { scanned: 1, finished: 1 });
  assert.equal(ctx.raw.prepare("SELECT status FROM platform_events WHERE id=?").get(event.id).status, "FINISHED");
  assert.equal(ctx.raw.prepare("SELECT availability_status FROM universal_content_library WHERE content_id=?").get(contentId).availability_status, "AVAILABLE");
  assert.deepEqual(await reconcilePlatformEvents(ctx.env, 10_002, 100), { scanned: 0, finished: 0 });
});

test("conteúdo reservado fica fora de DAILY e FREE_PLAY até cancelamento", async t => {
  const { ctx, contentId, version } = await fixture(t);
  const admin = { organizationId: "org-1", userId: "admin" };
  const player = { organizationId: "org-1", userId: "player" };
  const event = await createPlatformEvent(ctx.env, admin, input(contentId, version), 100);
  await schedulePlatformEvent(ctx.env, admin, event.id, 200);

  await assert.rejects(
    generateFreePlaySelection(ctx.env, player, {
      gameType: GameType.WORDLE,
      idempotencyKey: "reserved-free-play",
      filters: { count: 1 },
    }, 2_000),
    /insufficient_eligible_content/,
  );
  await assert.rejects(
    getDailyObjective(ctx.env, player, GameType.WORDLE, Date.UTC(2026, 7, 2, 12)),
    /insufficient_eligible_content/,
  );

  await cancelPlatformEvent(ctx.env, admin, event.id, 300);
  const freePlay = await generateFreePlaySelection(ctx.env, player, {
    gameType: GameType.WORDLE,
    idempotencyKey: "released-free-play",
    filters: { count: 1 },
  }, 2_001);
  assert.equal(freePlay.gameType, GameType.WORDLE);
});

test("reservas de uma organização não afetam o catálogo de outra", async t => {
  const { ctx, contentId, version } = await fixture(t);
  seedOrganization(ctx, { id: "org-2", name: "Organização 2" });
  seedUser(ctx, { id: "org-2-admin", organizationId: "org-2", role: "admin" });
  const other = await createUniversalDraft(ctx.env, "org-2", "org-2-admin", {
    gameType: GameType.WORDLE,
    status: ContentStatus.DRAFT,
    metadata: { category: "Palavras", tags: ["fé"], difficulty: "MEDIUM", biblicalReference: "João 3:16", status: ContentStatus.DRAFT, internalNotes: null },
    payload: { word: "JESUS", hint: "O Salvador" },
  });
  await transitionUniversalContentStatus(ctx.env, "org-2", "org-2-admin", other.content.id, ContentStatus.PUBLISHED, other.content.version);
  const event = await createPlatformEvent(ctx.env, { organizationId: "org-1", userId: "admin" }, input(contentId, version), 100);
  await schedulePlatformEvent(ctx.env, { organizationId: "org-1", userId: "admin" }, event.id, 200);

  const generated = await generateFreePlaySelection(ctx.env, { organizationId: "org-2", userId: "org-2-admin" }, {
    gameType: GameType.WORDLE,
    idempotencyKey: "org-2-free-play-event-isolation-0001",
    filters: { count: 1 },
  }, 2_000);
  assert.equal(generated.gameType, GameType.WORDLE);
});
