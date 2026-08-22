import assert from "node:assert/strict";
import test from "node:test";
import { recordPlatformGameCompletion } from "../../app/games/sdk/platformCompletion.ts";

const completion = {
  gameId: "wordle-biblico",
  sessionId: "session-wordle-retry",
  contentId: "wordle-content",
  contentVersion: 1,
  guesses: ["JESUS"],
};

test("completion retries a transient server failure with the exact same payload", async t => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (_url, init) => {
    requests.push(String(init.body));
    return requests.length === 1
      ? new Response(JSON.stringify({ error: "temporary_failure" }), { status: 503 })
      : Response.json({ score: 600, processing: "completed" });
  };

  const result = await recordPlatformGameCompletion(completion);
  assert.equal(result.score, 600);
  assert.equal(requests.length, 2);
  assert.equal(requests[0], requests[1]);
});

test("completion does not retry a permanent client error", async t => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify({ error: "invalid_game_completion" }), { status: 400 });
  };

  await assert.rejects(() => recordPlatformGameCompletion(completion), /game_completion_not_recorded/);
  assert.equal(requests, 1);
});
