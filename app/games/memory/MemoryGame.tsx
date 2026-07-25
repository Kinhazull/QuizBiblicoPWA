"use client";

import { useEffect, useRef, useState } from "react";
import { createGameSessionId, GameLayout, recordPlatformGameCompletion, type GamePlayStatus } from "../sdk";
import { areMatchingMemoryCards, createMemoryDeck, memoryScore } from "./engine";
import { MEMORY_SETS } from "./sets";

const HIDE_DELAY_MS = 650;

export function MemoryGame() {
  const set = MEMORY_SETS[0];
  const sessionId = useRef(createGameSessionId());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deck, setDeck] = useState(() => createMemoryDeck(set));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [revealedCardIds, setRevealedCardIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [message, setMessage] = useState("Encontre os oito pares bíblicos.");

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  function reveal(cardId: string) {
    if (status !== "playing" || locked || selectedIds.includes(cardId)) return;
    const card = deck.find(item => item.cardId === cardId);
    if (!card || matchedPairIds.includes(card.pairId)) return;
    if (selectedIds.length === 0) return setSelectedIds([cardId]);

    const first = deck.find(item => item.cardId === selectedIds[0]);
    if (!first) return;
    const nextHistory = [...revealedCardIds, first.cardId, card.cardId];
    const nextMoves = moves + 1;
    setSelectedIds([first.cardId, card.cardId]);
    setRevealedCardIds(nextHistory);
    setMoves(nextMoves);

    if (areMatchingMemoryCards(first, card)) {
      const nextMatched = [...matchedPairIds, card.pairId];
      setMatchedPairIds(nextMatched);
      setMessage(`Par encontrado: ${card.title}.`);
      hideTimer.current = setTimeout(() => setSelectedIds([]), 250);
      if (nextMatched.length === set.pairs.length) {
        setStatus("won");
        setMessage(`Todos os pares encontrados! Você fez ${memoryScore(nextMoves)} pontos.`);
        void recordPlatformGameCompletion({
          gameId: "memoria-biblica",
          sessionId: sessionId.current,
          setId: set.id,
          revealedCardIds: nextHistory,
        }).catch(() => undefined);
      }
      return;
    }
    setLocked(true);
    setMessage("Essas cartas não formam um par. Continue tentando.");
    hideTimer.current = setTimeout(() => {
      setSelectedIds([]);
      setLocked(false);
    }, HIDE_DELAY_MS);
  }

  function restart() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    sessionId.current = createGameSessionId();
    setDeck(createMemoryDeck(set));
    setSelectedIds([]);
    setMatchedPairIds([]);
    setRevealedCardIds([]);
    setMoves(0);
    setLocked(false);
    setStatus("playing");
    setMessage("Encontre os oito pares bíblicos.");
  }

  return (
    <GameLayout eyebrow="Exercite sua memória" title="Memória" highlightedTitle="Bíblica"
      description="Vire as cartas e encontre os pares relacionados à Bíblia."
      status={status} currentAttempt={matchedPairIds.length} maxAttempts={set.pairs.length}
      progressLabel="Pares encontrados" onRestart={restart}>
      <section className="memory-game" aria-label="Memória Bíblica">
        <header className="memory-heading">
          <div><span>Conjunto</span><h2>{set.title}</h2></div>
          <p><strong>{matchedPairIds.length}</strong> de {set.pairs.length} pares · {moves} jogada(s)</p>
        </header>
        <div className="memory-board" role="group" aria-label="Tabuleiro com dezesseis cartas">
          {deck.map(card => {
            const visible = selectedIds.includes(card.cardId) || matchedPairIds.includes(card.pairId);
            const matched = matchedPairIds.includes(card.pairId);
            return <button className={`memory-card${visible ? " is-visible" : ""}${matched ? " is-matched" : ""}`}
              key={card.cardId} type="button" onClick={() => reveal(card.cardId)}
              disabled={status !== "playing" || locked || matched}
              aria-label={visible ? card.title : "Carta oculta"} aria-pressed={visible}>
              <span className="memory-card-back" aria-hidden="true">✦</span>
              <span className="memory-card-front" aria-hidden={!visible}><b>{card.icon}</b><small>{card.title}</small></span>
            </button>;
          })}
        </div>
        <p className={`memory-message ${status}`} role="status" aria-live="polite">{message}</p>
      </section>
    </GameLayout>
  );
}
