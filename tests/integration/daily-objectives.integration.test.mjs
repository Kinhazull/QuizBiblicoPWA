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
  updateUniversalDraft,
} from "../../functions/_lib/universal-content-store.ts";
import {
  dailyWordleSeed,
  dailyWordleSelectionKey,
  finishDailyParticipation,
  getDailyObjective,
  getDailyWordleObjective,
  organizationDayKey,
  startDailyObjective,
  validateDailyGameAction,
} from "../../functions/_lib/platform-daily-objectives.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";
import { onRequestGet as listObjectives } from "../../functions/api/platform/daily-objectives/index.ts";
import { onRequestGet as wordleObjective } from "../../functions/api/platform/daily-objectives/wordle.ts";

const DAY_ONE = Date.UTC(2026, 6, 29, 12);
const DAY_TWO = Date.UTC(2026, 6, 30, 12);

function contentInput(word, hint = "Uma pista segura") {
  return {
    gameType: GameType.WORDLE,
    status: ContentStatus.DRAFT,
    metadata: {
      category: "Conceitos",
      tags: ["fé"],
      difficulty: "MEDIUM",
      biblicalReference: "João 1:1",
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
  seedUser(ctx, { id: "user-1" });
  seedUser(ctx, { id: "user-2" });
  seedUser(ctx, { id: "user-org-2", organizationId: "org-2" });
  ctx.raw.prepare("UPDATE organizations SET timezone='UTC'").run();
  return ctx;
}

async function publish(ctx, organizationId, actorId, word, hint) {
  const draft = await createUniversalDraft(
    ctx.env,
    organizationId,
    actorId,
    contentInput(word, hint),
  );
  assert.equal(draft.ok, true, JSON.stringify(draft));
  const published = await transitionUniversalContentStatus(
    ctx.env,
    organizationId,
    actorId,
    draft.content.id,
    ContentStatus.PUBLISHED,
    draft.content.version,
  );
  assert.equal(published.ok, true, JSON.stringify(published));
  return published.content;
}

async function publishGame(ctx, gameType, payload) {
  const draft = await createUniversalDraft(ctx.env, "org-1", "user-1", {
    gameType,
    status: ContentStatus.DRAFT,
    metadata: {
      category: "Bíblia",
      tags: ["diário"],
      difficulty: "MEDIUM",
      biblicalReference: "Hebreus 11",
      status: ContentStatus.DRAFT,
      internalNotes: null,
    },
    payload,
  });
  assert.equal(draft.ok, true, JSON.stringify(draft));
  const published = await transitionUniversalContentStatus(
    ctx.env,
    "org-1",
    "user-1",
    draft.content.id,
    ContentStatus.PUBLISHED,
    draft.content.version,
  );
  assert.equal(published.ok, true, JSON.stringify(published));
  return published.content;
}

test("daily Wordle seed and selection are deterministic, unique by organization and day", async t => {
  const ctx = fixture(t);
  await publish(ctx, "org-1", "user-1", "GRACA");
  await publish(ctx, "org-2", "user-org-2", "PEDRO");

  const first = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-1" },
    DAY_ONE,
  );
  const repeatedForAnotherUser = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-2" },
    DAY_ONE + 1_000,
  );
  const otherOrganization = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-2", userId: "user-org-2" },
    DAY_ONE,
  );
  const nextDay = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-1" },
    DAY_TWO,
  );

  assert.equal(first.id, repeatedForAnotherUser.id);
  assert.notEqual(first.id, otherOrganization.id);
  assert.notEqual(first.id, nextDay.id);
  assert.equal(first.selectionKey, dailyWordleSelectionKey("2026-07-29"));
  assert.match(first.playHref, /^\/jogos\/wordle-biblico\?daily=selection_/);
  assert.equal(
    dailyWordleSeed("org-1", "2026-07-29"),
    "org-1:2026-07-29:wordle-biblico:v1",
  );
  assert.equal(organizationDayKey(DAY_ONE, "UTC"), "2026-07-29");
  assert.equal(
    ctx.raw.prepare("SELECT COUNT(*) total FROM generated_game_selections").get().total,
    3,
  );
});

test("daily objective pins historical content and never exposes the answer", async t => {
  const ctx = fixture(t);
  const original = await publish(ctx, "org-1", "user-1", "GRACA", "Favor imerecido");
  const selected = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-1" },
    DAY_ONE,
  );
  const draft = await transitionUniversalContentStatus(
    ctx.env,
    "org-1",
    "user-1",
    original.id,
    ContentStatus.DRAFT,
    original.version,
  );
  assert.equal(draft.ok, true);
  const updated = await updateUniversalDraft(
    ctx.env,
    "org-1",
    "user-1",
    original.id,
    { ...contentInput("PEDRO", "Discípulo"), version: draft.content.version },
  );
  assert.equal(updated.ok, true);
  const republished = await transitionUniversalContentStatus(
    ctx.env,
    "org-1",
    "user-1",
    original.id,
    ContentStatus.PUBLISHED,
    updated.content.version,
  );
  assert.equal(republished.ok, true);

  const repeated = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-1" },
    DAY_ONE + 2_000,
  );
  assert.equal(repeated.id, selected.id);
  assert.equal(repeated.content.version, original.version);
  assert.equal(repeated.content.hint, "Favor imerecido");
  assert.equal("word" in repeated.content, false);
  assert.equal(JSON.stringify(repeated).includes("GRACA"), false);
});

test("daily objective lifecycle is stored per participant and usage is idempotent", async t => {
  const ctx = fixture(t);
  await publish(ctx, "org-1", "user-1", "GRACA");
  const objective = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-1" },
    DAY_ONE,
  );
  assert.equal(objective.status, "CREATED");

  const completedAt = DAY_ONE + 1_000;
  const started = await startDailyObjective(ctx.env, {
    organizationId: "org-1", userId: "user-1",
  }, objective.selectionId, completedAt);
  await startDailyObjective(ctx.env, {
    organizationId: "org-1", userId: "user-1",
  }, objective.selectionId, completedAt + 1);
  assert.equal(started.status, "STARTED");
  assert.equal(ctx.raw.prepare("SELECT usage_count FROM universal_content_library").get().usage_count, 1);
  await finishDailyParticipation(ctx.env, {
    organizationId: "org-1", userId: "user-1",
  }, objective.selectionId, "daily-finished-event", completedAt + 2);

  const finished = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-1" },
    DAY_ONE + 2_000,
  );
  const otherUser = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-2" },
    DAY_ONE + 2_000,
  );
  assert.equal(finished.status, "FINISHED");
  assert.equal(otherUser.status, "CREATED");
});

test("daily Wordle actions validate guesses without exposing the answer", async t => {
  const ctx = fixture(t);
  await publish(ctx, "org-1", "user-1", "GRACA");
  const objective = await getDailyWordleObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-1" },
    DAY_ONE,
  );
  await startDailyObjective(
    ctx.env,
    { organizationId: "org-1", userId: "user-1" },
    objective.selectionId,
    DAY_ONE,
  );
  await publish(ctx, "org-1", "user-1", "PEDRO");
  await assert.rejects(() => validateDailyGameAction(ctx.env, {
    organizationId: "org-1",
    userId: "user-1",
  }, {
    selectionId: objective.selectionId,
    gameType: GameType.WORDLE,
    action: "validate_guess",
    payload: { guess: "AEIOU" },
  }, DAY_ONE), /invalid_wordle_word/);
  const wrong = await validateDailyGameAction(ctx.env, {
    organizationId: "org-1",
    userId: "user-1",
  }, {
    selectionId: objective.selectionId,
    gameType: GameType.WORDLE,
    action: "validate_guess",
    payload: { guess: "PEDRO" },
  }, DAY_ONE);
  const correct = await validateDailyGameAction(ctx.env, {
    organizationId: "org-1",
    userId: "user-1",
  }, {
    selectionId: objective.selectionId,
    gameType: GameType.WORDLE,
    action: "validate_guess",
    payload: { guess: "GRACA" },
  }, DAY_ONE);
  assert.equal(wrong.correct, false);
  assert.equal(correct.correct, true);
  assert.equal(JSON.stringify(wrong).includes("GRACA"), false);
  assert.equal(JSON.stringify(correct).includes("GRACA"), false);
});

test("daily Association, Who Am I and Three Clues expose safe payloads and validate on the server", async t => {
  const ctx = fixture(t);
  const fixtures = [
    {
      gameType: GameType.ASSOCIATION,
      payload: {
        title: "Associações",
        pairs: [
          { left: "Moisés", right: "Mar Vermelho" },
          { left: "Davi", right: "Golias" },
          { left: "Noé", right: "Arca" },
        ],
      },
      secret: "Mar Vermelho",
      action: async objective => {
        const leftId = objective.content.leftItems.find(item => item.label === "Moisés").id;
        const rightId = objective.content.rightItems.find(item => item.label === "Mar Vermelho").id;
        return validateDailyGameAction(ctx.env, { organizationId: "org-1", userId: "user-1" }, {
          selectionId: objective.selectionId,
          gameType: GameType.ASSOCIATION,
          action: "validate_pair",
          payload: { leftId, rightId },
        }, DAY_ONE);
      },
    },
    {
      gameType: GameType.WHO_AM_I,
      payload: {
        title: "Personagens",
        challenges: [
          { answer: "Moisés", hints: ["Fui criado no Egito", "Conduzi o povo", "Recebi os mandamentos"] },
          { answer: "Davi", hints: ["Fui pastor", "Enfrentei um gigante", "Fui rei"] },
          { answer: "Ester", hints: ["Fui rainha", "Arrisquei minha vida", "Salvei meu povo"] },
        ],
      },
      secret: "Moisés",
      action: objective => validateDailyGameAction(
        ctx.env,
        { organizationId: "org-1", userId: "user-1" },
        {
          selectionId: objective.selectionId,
          gameType: GameType.WHO_AM_I,
          action: "validate_answer",
          payload: { challengeId: objective.content.challenges[0].id, answer: "Moisés" },
        },
        DAY_ONE,
      ),
    },
    {
      gameType: GameType.THREE_CLUES,
      payload: {
        title: "Três Pistas",
        challenges: [
          { answer: "Arca", clues: ["Foi construída", "Protegeu uma família", "Enfrentou o dilúvio"] },
          { answer: "Maná", clues: ["Veio do céu", "Alimentou o povo", "Apareceu no deserto"] },
          { answer: "Jericó", clues: ["Era uma cidade", "Tinha muralhas", "Caiu após trombetas"] },
        ],
      },
      secret: "Arca",
      action: objective => validateDailyGameAction(
        ctx.env,
        { organizationId: "org-1", userId: "user-1" },
        {
          selectionId: objective.selectionId,
          gameType: GameType.THREE_CLUES,
          action: "validate_answer",
          payload: { challengeId: objective.content.challenges[0].id, answer: "Arca" },
        },
        DAY_ONE,
      ),
    },
  ];

  for (const fixture of fixtures) {
    await publishGame(ctx, fixture.gameType, fixture.payload);
    const objective = await getDailyObjective(
      ctx.env,
      { organizationId: "org-1", userId: "user-1" },
      fixture.gameType,
      DAY_ONE,
    );
    assert.equal(JSON.stringify(objective.content).includes(fixture.secret), fixture.gameType === GameType.ASSOCIATION);
    if (fixture.gameType !== GameType.ASSOCIATION) {
      assert.equal(JSON.stringify(objective.content).includes(fixture.secret), false);
    }
    await startDailyObjective(
      ctx.env,
      { organizationId: "org-1", userId: "user-1" },
      objective.selectionId,
      DAY_ONE,
    );
    const result = await fixture.action(objective);
    assert.equal(result.correct, true);
  }
});

test("authenticated daily endpoints expose seven objectives and protect Wordle answer", async t => {
  const ctx = fixture(t);
  await publish(ctx, "org-1", "user-1", "GRACA");
  const token = await createSession(ctx, "user-1");
  const request = createAuthenticatedRequest(
    "http://local.test/api/platform/daily-objectives",
    { token },
  );
  const listResponse = await listObjectives({ request, env: ctx.env });
  const listBody = await responseJson(listResponse);
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.objectives.length, 7);
  assert.equal(listBody.objectives[0].gameType, "wordle-biblico");
  assert.equal(JSON.stringify(listBody).includes("GRACA"), false);

  const detailRequest = createAuthenticatedRequest(
    "http://local.test/api/platform/daily-objectives/wordle",
    { token },
  );
  const detailResponse = await wordleObjective({ request: detailRequest, env: ctx.env });
  const detailBody = await responseJson(detailResponse);
  assert.equal(detailResponse.status, 200);
  assert.equal(detailBody.objective.selectionId, listBody.objectives[0].selectionId);
  assert.equal("word" in detailBody.objective.content, false);

  const anonymous = await listObjectives({
    request: new Request("http://local.test/api/platform/daily-objectives"),
    env: ctx.env,
  });
  assert.equal(anonymous.status, 401);
});
