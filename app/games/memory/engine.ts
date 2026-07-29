export type MemoryPair = { id: string; front: string; back: string };
export type MemorySet = { id: string; title: string; pairs: readonly MemoryPair[] };

export type MemoryCard = { cardId: string; pairId: string; label: string };
export type MemoryCompletionResult = { moves: number; score: number; matchedPairIds: string[] };

export function createMemoryDeck(set: MemorySet, random: () => number = Math.random) {
  const cards = set.pairs.flatMap(pair => [
    { cardId: `${pair.id}:a`, pairId: pair.id, label: pair.front },
    { cardId: `${pair.id}:b`, pairId: pair.id, label: pair.back },
  ]);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [cards[index], cards[target]] = [cards[target], cards[index]];
  }
  if (cards.length > 1 && cards.every((card, index) => {
    const pair = set.pairs[Math.floor(index / 2)];
    return card.cardId === `${pair.id}:${index % 2 === 0 ? "a" : "b"}`;
  })) {
    [cards[0], cards[1]] = [cards[1], cards[0]];
  }
  return cards;
}

export function areMatchingMemoryCards(first: MemoryCard, second: MemoryCard) {
  return first.cardId !== second.cardId && first.pairId === second.pairId;
}

export function memoryScore(moves: number, pairCount = 8) {
  if (!Number.isInteger(pairCount) || pairCount < 3 || pairCount > 12
    || !Number.isInteger(moves) || moves < pairCount) throw new Error("invalid_memory_moves");
  return Math.max(100, (pairCount * 150) - ((moves - pairCount) * 50));
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
  return { moves, score: memoryScore(moves, set.pairs.length), matchedPairIds: [...matched] };
}
