import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  GameContentMode,
  GameContentProviderRegistry,
  gameContentRequestFromLocation,
  loadGameContent,
} from "../../app/games/loader/index.ts";
import { GameType } from "../../shared/content.ts";
import { getGameGenerationCapability } from "../../functions/_lib/universal-game-generation-capabilities.ts";
import { GameGenerationMode } from "../../functions/_lib/universal-game-generation-contract.ts";

const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const normalFixtures = {
  [GameType.WORDLE]: {
    endpoint: "/api/platform/games/wordle",
    response: { content: { id: "wordle-1", version: 2, wordLength: 5, hint: "Favor", biblicalReference: null } },
  },
  [GameType.TIMELINE]: {
    endpoint: "/api/platform/games/timeline",
    response: { content: { id: "timeline-1", version: 3, title: "Linha", events: [], biblicalReference: null } },
  },
  [GameType.MEMORY]: {
    endpoint: "/api/platform/games/memory",
    response: { content: { id: "memory-1", version: 4, title: "Memória", cards: [], pairCount: 0, biblicalReference: null } },
  },
  [GameType.ASSOCIATION]: {
    endpoint: "/api/platform/games/association",
    response: { content: { id: "association-1", version: 1, title: "Associação", leftItems: [], rightItems: [], pairCount: 0 } },
  },
  [GameType.WHO_AM_I]: {
    endpoint: "/api/platform/games/who-am-i",
    response: { content: { id: "who-1", version: 1, title: "Quem Sou Eu?", challenges: [] } },
  },
  [GameType.THREE_CLUES]: {
    endpoint: "/api/platform/games/three-clues",
    response: { content: { id: "clues-1", version: 1, title: "Três Pistas", challenges: [] } },
  },
};

test("normal provider standardizes content for games with a direct CMS endpoint", async () => {
  for (const [gameType, fixture] of Object.entries(normalFixtures)) {
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      assert.equal(url, fixture.endpoint);
      return jsonResponse(fixture.response);
    };
    const loaded = await loadGameContent({ gameType, mode: GameContentMode.NORMAL });
    assert.equal(loaded.mode, GameContentMode.NORMAL);
    assert.equal(loaded.gameType, gameType);
    assert.equal(loaded.selectionId, null);
    assert.ok(loaded.contentId);
    assert.ok(loaded.contentVersion >= 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.cache, "no-store");
  }
});

test("Quiz NORMAL provider exposes only the explicit transitional read bridge", async () => {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    return jsonResponse({ round: { id: "legacy-round-1", version: 1, title: "Quiz Bíblico" } });
  };
  const loaded = await loadGameContent({ gameType: GameType.QUIZ, mode: GameContentMode.NORMAL });
  assert.equal(loaded.contentId, "legacy-round-1");
  assert.deepEqual(calls, ["/api/rounds/current"]);
});

test("daily provider starts and loads the selected objective through one contract", async () => {
  const dailyFixtures = {
    [GameType.WORDLE]: { id: "wordle-1", version: 1, hint: "Pista", wordLength: 5 },
    [GameType.TIMELINE]: { id: "timeline-1", version: 1, title: "Linha", events: [] },
    [GameType.MEMORY]: { id: "memory-1", version: 1, title: "Memória", cards: [], pairCount: 0 },
    [GameType.QUIZ]: { questions: [{ id: "quiz-1", version: 1, prompt: "Pergunta", choices: [] }] },
    [GameType.ASSOCIATION]: { id: "association-1", version: 1, title: "Associação", leftItems: [], rightItems: [], pairCount: 0 },
    [GameType.WHO_AM_I]: { id: "who-1", version: 1, title: "Quem Sou Eu?", challenges: [] },
    [GameType.THREE_CLUES]: { id: "clues-1", version: 1, title: "Três Pistas", challenges: [] },
  };
  const routeByGame = {
    [GameType.QUIZ]: "quiz",
    [GameType.WORDLE]: "wordle",
    [GameType.TIMELINE]: "timeline",
    [GameType.MEMORY]: "memory",
    [GameType.ASSOCIATION]: "association",
    [GameType.WHO_AM_I]: "who-am-i",
    [GameType.THREE_CLUES]: "three-clues",
  };
  for (const [gameType, content] of Object.entries(dailyFixtures)) {
    const calls = [];
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      if (url === "/api/platform/daily-objectives/start") {
        return jsonResponse({ participation: { participationId: "participation-1", status: "STARTED" } });
      }
      return jsonResponse({
        objective: {
          selectionId: "selection-1",
          participationId: "participation-1",
          gameType,
          title: "Objetivo",
          expiresAt: 123,
          content,
        },
      });
    };
    const loaded = await loadGameContent({
      gameType,
      mode: GameContentMode.DAILY,
      selectionId: "selection-1",
    });
    assert.equal(loaded.mode, GameContentMode.DAILY);
    assert.equal(loaded.selectionId, "selection-1");
    assert.equal(loaded.participationId, "participation-1");
    assert.equal(calls[0], "/api/platform/daily-objectives/start");
    assert.match(calls[1], new RegExp(`/daily-objectives/${routeByGame[gameType]}$`));
  }
});

test("loader selects DAILY only from an explicit daily selection", () => {
  assert.deepEqual(
    gameContentRequestFromLocation(GameType.WORDLE, "?freePlay=selection-2"),
    { gameType: GameType.WORDLE, mode: GameContentMode.FREE_PLAY, selectionId: "selection-2" },
  );
  assert.deepEqual(
    gameContentRequestFromLocation(GameType.WORDLE, "?daily=selection-1"),
    { gameType: GameType.WORDLE, mode: GameContentMode.DAILY, selectionId: "selection-1" },
  );
  assert.deepEqual(
    gameContentRequestFromLocation(GameType.WORDLE, ""),
    { gameType: GameType.WORDLE, mode: GameContentMode.NORMAL, selectionId: null },
  );
});

test("free play provider starts and reloads the same immutable selection", async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (url === "/api/platform/free-play/start") {
      return jsonResponse({ participation: { participationId: "participation-free", status: "STARTED" } });
    }
    return jsonResponse({
      game: {
        selectionId: "selection-free",
        participationId: "participation-free",
        gameType: GameType.WORDLE,
        title: "Modo Livre",
        content: { id: "wordle-free", version: 2, hint: "Pista", wordLength: 5 },
      },
    });
  };
  const loaded = await loadGameContent({
    gameType: GameType.WORDLE,
    mode: GameContentMode.FREE_PLAY,
    selectionId: "selection-free",
  });
  assert.equal(loaded.mode, GameContentMode.FREE_PLAY);
  assert.equal(loaded.selectionId, "selection-free");
  assert.equal(loaded.participationId, "participation-free");
  assert.deepEqual(calls, [
    "/api/platform/free-play/start",
    "/api/platform/free-play/selection?selectionId=selection-free",
  ]);
});

test("provider registry rejects duplicates and disabled EVENT mode", () => {
  const provider = { mode: GameContentMode.NORMAL, async load() { return {}; } };
  const registry = new GameContentProviderRegistry().register(provider);
  assert.throws(() => registry.register(provider), /game_content_provider_duplicate/);
  assert.throws(() => registry.resolve(GameContentMode.EVENT), /game_content_provider_unavailable/);
});

test("all seven game capabilities support deterministic DAILY and FREE_PLAY generation", () => {
  for (const gameType of Object.values(GameType)) {
    const capability = getGameGenerationCapability(gameType);
    assert.ok(capability);
    assert.equal(capability.supportedModes.includes(GameGenerationMode.DAILY), true);
    assert.equal(capability.supportedModes.includes(GameGenerationMode.FREE_PLAY), true);
  }
});

test("migrated games do not know content or daily endpoints", async () => {
  const files = [
    "app/games/wordle/WordleGame.tsx",
    "app/games/timeline/TimelineGame.tsx",
    "app/games/memory/MemoryGame.tsx",
    "app/games/theme-association/ThemeAssociationGame.tsx",
    "app/games/who-am-i/WhoAmIGame.tsx",
    "app/games/three-clues/ThreeCluesGame.tsx",
    "app/jogar/page.tsx",
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /\/api\/platform\/daily-objectives/);
    assert.doesNotMatch(source, /\/api\/platform\/free-play/);
    assert.doesNotMatch(source, /\/api\/platform\/games\/(?:wordle|timeline|memory|association|who-am-i|three-clues)/);
    assert.doesNotMatch(source, /\/api\/rounds\/current/);
    assert.match(source, /loadGameContent/);
  }
});
