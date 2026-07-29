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
} from "../../functions/_lib/universal-content-store.ts";
import {
  LibraryAvailabilityStatus,
  LibraryOrder,
  listUniversalLibrary,
  recordUniversalLibraryUsage,
} from "../../functions/_lib/universal-content-library.ts";
import {
  listEligibleUniversalContent,
} from "../../functions/_lib/universal-eligible-content-catalog.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";

const payloads = {
  [GameType.QUIZ]: {
    prompt: "Quem construiu a arca segundo o relato bíblico?",
    choices: [
      { text: "Noé", correct: true },
      { text: "Moisés", correct: false },
      { text: "Davi", correct: false },
      { text: "Paulo", correct: false },
    ],
    book: "Gênesis", theme: "Dilúvio", explanation: "Noé obedeceu a Deus.",
  },
  [GameType.WORDLE]: { word: "GRACA", hint: "Favor imerecido" },
  [GameType.ASSOCIATION]: {
    title: "Personagens e acontecimentos",
    pairs: Array.from({ length: 3 }, (_, index) => ({
      left: `Pessoa ${index}`,
      right: `Evento ${index}`,
    })),
  },
  [GameType.TIMELINE]: {
    title: "Eventos bíblicos",
    events: Array.from({ length: 4 }, (_, index) => ({
      title: `Evento ${index + 1}`,
      position: index + 1,
    })),
  },
  [GameType.MEMORY]: {
    title: "Símbolos bíblicos",
    pairs: Array.from({ length: 4 }, (_, index) => ({
      front: `Frente ${index + 1}`,
      back: `Verso ${index + 1}`,
    })),
  },
  [GameType.WHO_AM_I]: {
    title: "Personagens bíblicos",
    challenges: [
      { answer: "Moisés", hints: ["Egito", "Sarça", "Êxodo"] },
      { answer: "Davi", hints: ["Pastor", "Funda", "Rei"] },
      { answer: "Ester", hints: ["Pérsia", "Rainha", "Intercessão"] },
    ],
  },
  [GameType.THREE_CLUES]: {
    title: "Personagens bíblicos",
    challenges: [
      { answer: "Noé", clues: ["Obediência", "Arca", "Dilúvio"] },
      { answer: "Davi", clues: ["Pastor", "Funda", "Rei"] },
      { answer: "Ester", clues: ["Pérsia", "Rainha", "Intercessão"] },
    ],
  },
};

function draftInput(gameType, {
  category = "Fé",
  difficulty = "MEDIUM",
  tags = ["bíblia", "esperança"],
  biblicalReference = "Gênesis 6",
} = {}) {
  return {
    gameType,
    status: ContentStatus.DRAFT,
    metadata: {
      category,
      tags,
      difficulty,
      biblicalReference,
      status: ContentStatus.DRAFT,
      internalNotes: null,
    },
    payload: structuredClone(payloads[gameType]),
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

async function publish(ctx, gameType, options = {}, organizationId = "org-1", actorId = "admin-1") {
  const created = await createUniversalDraft(
    ctx.env,
    organizationId,
    actorId,
    draftInput(gameType, options),
  );
  assert.equal(created.ok, true);
  const published = await transitionUniversalContentStatus(
    ctx.env,
    organizationId,
    actorId,
    created.content.id,
    ContentStatus.PUBLISHED,
    created.content.version,
  );
  assert.equal(published.ok, true);
  return published.content;
}

test("publication creates the library projection and return to Draft removes eligibility", async t => {
  const ctx = fixture(t);
  const published = await publish(ctx, GameType.WORDLE, {
    category: "Graça",
    difficulty: "EASY",
    tags: ["evangelho", "graça"],
    biblicalReference: "Efésios 2:8",
  });
  const [entry] = await listUniversalLibrary(ctx.env, { organizationId: "org-1" });
  assert.equal(entry.contentId, published.id);
  assert.equal(entry.contentVersion, published.version);
  assert.equal(entry.availabilityStatus, LibraryAvailabilityStatus.AVAILABLE);
  assert.deepEqual(entry.themes, ["Graça"]);
  assert.deepEqual(entry.books, ["Efésios"]);
  assert.deepEqual(entry.tags, ["evangelho", "graça"]);
  assert.equal(entry.usageCount, 0);
  assert.equal((await listEligibleUniversalContent(ctx.env, { organizationId: "org-1" })).length, 1);

  const unpublished = await transitionUniversalContentStatus(
    ctx.env,
    "org-1",
    "admin-1",
    published.id,
    ContentStatus.DRAFT,
    published.version,
  );
  assert.equal(unpublished.ok, true);
  const [archived] = await listUniversalLibrary(ctx.env, { organizationId: "org-1" });
  assert.equal(archived.contentVersion, unpublished.content.version);
  assert.equal(archived.availabilityStatus, LibraryAvailabilityStatus.ARCHIVED);
  assert.equal((await listEligibleUniversalContent(ctx.env, { organizationId: "org-1" })).length, 0);
});

test("library projection failure rolls back the CMS publication atomically", async t => {
  const ctx = fixture(t);
  const created = await createUniversalDraft(
    ctx.env,
    "org-1",
    "admin-1",
    draftInput(GameType.WORDLE),
  );
  assert.equal(created.ok, true);
  ctx.raw.exec("DROP TABLE universal_content_library");

  await assert.rejects(
    transitionUniversalContentStatus(
      ctx.env,
      "org-1",
      "admin-1",
      created.content.id,
      ContentStatus.PUBLISHED,
      created.content.version,
    ),
    /universal_content_transition_failed/,
  );
  const stored = ctx.raw.prepare(
    "SELECT status,version FROM content_items WHERE id=?",
  ).get(created.content.id);
  assert.equal(stored.status, ContentStatus.DRAFT);
  assert.equal(stored.version, 1);
  assert.equal(ctx.raw.prepare(
    "SELECT COUNT(*) total FROM content_versions WHERE content_id=?",
  ).get(created.content.id).total, 1);
});

test("library filters by organization, game, difficulty, theme and availability", async t => {
  const ctx = fixture(t);
  const wordle = await publish(ctx, GameType.WORDLE, {
    category: "Salvação",
    difficulty: "EASY",
  });
  await publish(ctx, GameType.TIMELINE, {
    category: "História",
    difficulty: "HARD",
  });
  await publish(ctx, GameType.WORDLE, {
    category: "Outra organização",
    difficulty: "EASY",
  }, "org-2", "admin-2");
  ctx.raw.prepare(`UPDATE universal_content_library
    SET availability_status='RESERVED_DAILY' WHERE organization_id='org-1' AND content_id=?`)
    .run(wordle.id);

  assert.equal((await listUniversalLibrary(ctx.env, { organizationId: "org-1" })).length, 2);
  assert.equal((await listUniversalLibrary(ctx.env, {
    organizationId: "org-1",
    gameType: GameType.WORDLE,
  })).length, 1);
  assert.equal((await listUniversalLibrary(ctx.env, {
    organizationId: "org-1",
    difficulty: "HARD",
  }))[0].gameType, GameType.TIMELINE);
  assert.equal((await listUniversalLibrary(ctx.env, {
    organizationId: "org-1",
    theme: "história",
  }))[0].gameType, GameType.TIMELINE);
  assert.equal((await listUniversalLibrary(ctx.env, {
    organizationId: "org-1",
    availabilityStatus: LibraryAvailabilityStatus.RESERVED_DAILY,
  }))[0].contentId, wordle.id);
  ctx.raw.prepare(`UPDATE universal_content_library
    SET availability_status='RESERVED_EVENT' WHERE organization_id='org-1' AND content_id=?`)
    .run(wordle.id);
  assert.equal((await listUniversalLibrary(ctx.env, {
    organizationId: "org-1",
    availabilityStatus: LibraryAvailabilityStatus.RESERVED_EVENT,
  }))[0].contentId, wordle.id);
  assert.equal((await listEligibleUniversalContent(ctx.env, { organizationId: "org-1" })).length, 1);
});

test("ordering and the unused usage recorder are deterministic and version guarded", async t => {
  const ctx = fixture(t);
  const first = await publish(ctx, GameType.WORDLE, { category: "Primeiro" });
  const second = await publish(ctx, GameType.TIMELINE, { category: "Segundo" });
  ctx.raw.prepare(`UPDATE universal_content_library
    SET priority=10 WHERE organization_id='org-1' AND content_id=?`).run(second.id);

  assert.equal((await listUniversalLibrary(ctx.env, {
    organizationId: "org-1",
    order: LibraryOrder.PRIORITY,
  }))[0].contentId, second.id);
  assert.equal((await recordUniversalLibraryUsage(ctx.env, {
    organizationId: "org-1",
    contentId: first.id,
    contentVersion: first.version,
  }, "FREE_PLAY", 50)).updated, true);
  assert.equal((await recordUniversalLibraryUsage(ctx.env, {
    organizationId: "org-1",
    contentId: first.id,
    contentVersion: first.version + 1,
  }, "FREE_PLAY", 60)).updated, false);
  const leastUsed = await listUniversalLibrary(ctx.env, {
    organizationId: "org-1",
    order: LibraryOrder.LEAST_USED,
  });
  assert.equal(leastUsed[0].contentId, second.id);
  const used = leastUsed.find(entry => entry.contentId === first.id);
  assert.equal(used.usageCount, 1);
  assert.equal(used.lastUsedAt, 50);
  assert.equal(used.lastUsedMode, "FREE_PLAY");
});

test("eligible catalog supports every registered GameType and excludes stale or invalid content", async t => {
  const ctx = fixture(t);
  for (const gameType of Object.values(GameType)) await publish(ctx, gameType);
  const eligible = await listEligibleUniversalContent(ctx.env, {
    organizationId: "org-1",
    order: LibraryOrder.PUBLICATION_OLDEST,
    limit: 20,
  });
  assert.deepEqual(
    new Set(eligible.map(entry => entry.gameType)),
    new Set(Object.values(GameType)),
  );

  const stale = eligible[0];
  ctx.raw.prepare("UPDATE content_items SET version=version+1 WHERE id=?").run(stale.contentId);
  const invalid = eligible[1];
  ctx.raw.prepare("UPDATE content_items SET payload_json='{}' WHERE id=?").run(invalid.contentId);
  const afterCorruption = await listEligibleUniversalContent(ctx.env, {
    organizationId: "org-1",
    limit: 20,
  });
  assert.equal(afterCorruption.some(entry => entry.contentId === stale.contentId), false);
  assert.equal(afterCorruption.some(entry => entry.contentId === invalid.contentId), false);
});
