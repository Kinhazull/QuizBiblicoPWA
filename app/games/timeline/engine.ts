import type { TimelineEvent, TimelineRound } from "./rounds";

export const TIMELINE_MAX_ATTEMPTS = 3;

export function correctTimelineOrder(round: TimelineRound) {
  return [...round.events].sort((left, right) => left.position - right.position);
}

export function isCorrectTimelineOrder(round: TimelineRound, eventIds: readonly string[]) {
  if (eventIds.length !== round.events.length || new Set(eventIds).size !== eventIds.length) return false;
  const expected = correctTimelineOrder(round).map(event => event.id);
  return expected.every((id, index) => eventIds[index] === id);
}

export function moveTimelineEvent(events: readonly TimelineEvent[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (!Number.isInteger(index) || index < 0 || index >= events.length || target < 0 || target >= events.length) {
    return [...events];
  }
  const moved = [...events];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

export function shuffleTimelineEvents(
  events: readonly TimelineEvent[],
  random: () => number = Math.random,
) {
  const shuffled = [...events];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled.every((event, index) => event.id === events[index].id)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export function timelineScore(attemptsUsed: number) {
  if (!Number.isInteger(attemptsUsed) || attemptsUsed < 1 || attemptsUsed > TIMELINE_MAX_ATTEMPTS) {
    throw new Error("invalid_timeline_attempts");
  }
  return (TIMELINE_MAX_ATTEMPTS - attemptsUsed + 1) * 100;
}

export function nextTimelineRoundIndex(current: number, total: number) {
  if (!Number.isInteger(total) || total < 1) throw new Error("invalid_timeline_round_total");
  return (current + 1) % total;
}

