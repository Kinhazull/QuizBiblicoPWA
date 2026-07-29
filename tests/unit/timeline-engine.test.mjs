import assert from "node:assert/strict";
import test from "node:test";
import {
  correctTimelineOrder,
  isCorrectTimelineOrder,
  moveTimelineEvent,
  shuffleTimelineEvents,
  timelineScore,
  TIMELINE_MAX_ATTEMPTS,
} from "../../app/games/timeline/engine.ts";

const round = {
  id: "timeline-content",
  title: "Patriarcas",
  events: [
    { id: "event-1", title: "Abraão", position: 1 },
    { id: "event-2", title: "Isaque", position: 2 },
    { id: "event-3", title: "Jacó", position: 3 },
    { id: "event-4", title: "José", position: 4 },
  ],
};

test("timeline supports CMS rounds with three or more uniquely ordered events", () => {
  assert.equal(new Set(round.events.map(event => event.id)).size, 4);
  assert.deepEqual(correctTimelineOrder(round).map(event => event.position), [1, 2, 3, 4]);
  const compact = { ...round, events: round.events.slice(0, 3) };
  assert.equal(isCorrectTimelineOrder(compact, ["event-1", "event-2", "event-3"]), true);
});

test("timeline events move up and down without crossing list boundaries", () => {
  const events = round.events;
  assert.deepEqual(moveTimelineEvent(events, 1, -1).map(event => event.id), [
    events[1].id, events[0].id, events[2].id, events[3].id,
  ]);
  assert.deepEqual(moveTimelineEvent(events, 0, -1), [...events]);
  assert.deepEqual(moveTimelineEvent(events, events.length - 1, 1), [...events]);
});

test("timeline validates only the complete chronological sequence", () => {
  const correct = correctTimelineOrder(round).map(event => event.id);
  assert.equal(isCorrectTimelineOrder(round, correct), true);
  assert.equal(isCorrectTimelineOrder(round, [...correct].reverse()), false);
  assert.equal(isCorrectTimelineOrder(round, correct.slice(0, 3)), false);
  assert.equal(isCorrectTimelineOrder(round, [correct[0], correct[0], correct[2], correct[3]]), false);
});

test("shuffle never returns the original chronological order", () => {
  const events = correctTimelineOrder(round);
  const shuffled = shuffleTimelineEvents(events, () => 0.999);
  assert.notDeepEqual(shuffled.map(event => event.id), events.map(event => event.id));
  assert.deepEqual(new Set(shuffled.map(event => event.id)), new Set(events.map(event => event.id)));
});

test("timeline score respects the existing attempt limit", () => {
  assert.equal(TIMELINE_MAX_ATTEMPTS, 3);
  assert.deepEqual([timelineScore(1), timelineScore(2), timelineScore(3)], [300, 200, 100]);
  assert.throws(() => timelineScore(0), /invalid_timeline_attempts/);
});
