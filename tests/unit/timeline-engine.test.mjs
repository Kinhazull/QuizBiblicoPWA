import assert from "node:assert/strict";
import test from "node:test";
import {
  correctTimelineOrder,
  isCorrectTimelineOrder,
  moveTimelineEvent,
  nextTimelineRoundIndex,
  shuffleTimelineEvents,
  timelineScore,
  TIMELINE_MAX_ATTEMPTS,
} from "../../app/games/timeline/engine.ts";
import { TIMELINE_ROUNDS } from "../../app/games/timeline/rounds.ts";

test("timeline bank has extensible rounds with four unique ordered events", () => {
  assert.ok(TIMELINE_ROUNDS.length >= 4);
  assert.equal(new Set(TIMELINE_ROUNDS.map(round => round.id)).size, TIMELINE_ROUNDS.length);
  for (const round of TIMELINE_ROUNDS) {
    assert.equal(round.events.length, 4);
    assert.equal(new Set(round.events.map(event => event.id)).size, 4);
    assert.deepEqual(correctTimelineOrder(round).map(event => event.position), [1, 2, 3, 4]);
  }
});

test("timeline events move up and down without crossing list boundaries", () => {
  const events = TIMELINE_ROUNDS[0].events;
  assert.deepEqual(moveTimelineEvent(events, 1, -1).map(event => event.id), [
    events[1].id, events[0].id, events[2].id, events[3].id,
  ]);
  assert.deepEqual(moveTimelineEvent(events, 0, -1), [...events]);
  assert.deepEqual(moveTimelineEvent(events, events.length - 1, 1), [...events]);
});

test("timeline validates only the complete chronological sequence", () => {
  const round = TIMELINE_ROUNDS[0];
  const correct = correctTimelineOrder(round).map(event => event.id);
  assert.equal(isCorrectTimelineOrder(round, correct), true);
  assert.equal(isCorrectTimelineOrder(round, [...correct].reverse()), false);
  assert.equal(isCorrectTimelineOrder(round, correct.slice(0, 3)), false);
  assert.equal(isCorrectTimelineOrder(round, [correct[0], correct[0], correct[2], correct[3]]), false);
});

test("shuffle never returns the original chronological order", () => {
  const events = correctTimelineOrder(TIMELINE_ROUNDS[0]);
  const shuffled = shuffleTimelineEvents(events, () => 0.999);
  assert.notDeepEqual(shuffled.map(event => event.id), events.map(event => event.id));
  assert.deepEqual(new Set(shuffled.map(event => event.id)), new Set(events.map(event => event.id)));
});

test("timeline score and round rotation respect the MVP limits", () => {
  assert.equal(TIMELINE_MAX_ATTEMPTS, 3);
  assert.deepEqual([timelineScore(1), timelineScore(2), timelineScore(3)], [300, 200, 100]);
  assert.throws(() => timelineScore(0), /invalid_timeline_attempts/);
  assert.equal(nextTimelineRoundIndex(3, 4), 0);
});

