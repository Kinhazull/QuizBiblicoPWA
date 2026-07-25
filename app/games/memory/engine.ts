import type { MemorySet } from "./sets";

export type MemoryCard = { cardId: string; pairId: string; title: string; icon: string };
export type MemoryCompletionResult = { moves: number; score: number; matchedPairIds: string[] };

export function createMemoryDeck(set: MemorySet, random: () => number = Math.random) {
  const cards = set.pairs.flatMap(pair => [
    { cardId: `${pair.id}:a`, pairId: pair.id, title: pair.title, icon: pair.icon },
    { cardId: `${pair.id}:b`, pairId: pair.id, title: pair.title, icon: pair.icon },
  ]);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [cards[index], cards[target]] = [cards[target], cards[index]];
  }
  return cards;
}

export function areMatchingMemoryCards(first: MemoryCard, second: MemoryCard) {
  return first.cardId !== second.cardId && first.pairId === second.pairId;
}

export function memoryScore(moves: number) {
  if (!Number.isInteger(moves) || moves < 8) throw new Error("invalid_memory_moves");
  return Math.max(100, 1200 - ((moves - 8) * 50));
}

export function evaluateMemoryCompletion(set: MemorySet, revealedCardIds: readonly string[]): MemoryCompletionResult {
  if (!Array.isArray(revealedCardIds)
    || revealedCardIds.length < set.pairs.length * 2
    || revealedCardIds.length > 200
    || revealedCardIds.length % 2 !== 0
    || revealedCardIds.some(cardId => typeof cardId !== "string")) {
    throw new Error("invalid_memory_reveals");
  }
  const deck = new Map(createMemoryDeck(set, () => 0).map(card => [card.cardId, card]));
  const matched = new Set<string>();
  for (let index = 0; index < revealedCardIds.length; index += 2) {
    const first = deck.get(revealedCardIds[index]);
    const second = deck.get(revealedCardIds[index + 1]);
    if (!first || !second || first.cardId === second.cardId) throw new Error("invalid_memory_card");
    if (matched.has(first.pairId) || matched.has(second.pairId)) throw new Error("invalid_memory_replay");
    if (areMatchingMemoryCards(first, second)) matched.add(first.pairId);
  }
  if (matched.size !== set.pairs.length) throw new Error("incomplete_memory_game");
  const moves = revealedCardIds.length / 2;
  return { moves, score: memoryScore(moves), matchedPairIds: [...matched] };
}
