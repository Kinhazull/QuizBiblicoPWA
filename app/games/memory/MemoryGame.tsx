"use client";

import { useEffect, useRef, useState } from "react";
import { createGameSessionId, GameLayout, recordPlatformGameCompletion, type GamePlayStatus } from "../sdk";
import {
  GameContentMode,
  gameContentRequestFromLocation,
  loadGameContent,
  validateGameContentAction,
  type LoadedGameContent,
} from "../loader";
import { areMatchingMemoryCards, memoryScore, type MemoryCard } from "./engine";
import { GameType } from "../../../shared/content";

const HIDE_DELAY_MS = 650;

type PublishedMemory = {
  id: string;
  version: number;
  title: string;
  cards: Array<MemoryCard | { id: string; label: string }>;
  pairCount: number;
  biblicalReference: string | null;
};

function shuffledCards(cards: readonly MemoryCard[]) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function MemoryGame() {
  const sessionId = useRef(createGameSessionId());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [content, setContent] = useState<PublishedMemory | null>(null);
  const [loadedContent, setLoadedContent] = useState<LoadedGameContent<PublishedMemory> | null>(null);
  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);
  const [revealedCardIds, setRevealedCardIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("Encontre todos os pares bíblicos.");

  useEffect(() => {
    const controller = new AbortController();
    async function loadMemory() {
      setLoading(true);
      setLoadError(false);
      try {
        const loaded = await loadGameContent<PublishedMemory>({
          ...gameContentRequestFromLocation(GameType.MEMORY),
          signal: controller.signal,
        });
        const normalized = {
          ...loaded.payload,
          id: loaded.contentId,
          version: loaded.contentVersion,
          cards: loaded.payload.cards.map(card => "cardId" in card
            ? card
            : { cardId: card.id, pairId: "", label: card.label }),
        };
        setLoadedContent(loaded);
        setContent(normalized);
        setDeck(shuffledCards(normalized.cards as MemoryCard[]));
        setMessage(`Encontre os ${normalized.pairCount} pares bíblicos.`);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadMemory();
    return () => {
      controller.abort();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  async function reveal(cardId: string) {
    if (!content || !loadedContent || status !== "playing" || locked || selectedIds.includes(cardId)) return;
    const card = deck.find(item => item.cardId === cardId);
    if (!card || matchedCardIds.includes(card.cardId)) return;
    if (selectedIds.length === 0) return setSelectedIds([cardId]);

    const first = deck.find(item => item.cardId === selectedIds[0]);
    if (!first) return;
    const nextHistory = [...revealedCardIds, first.cardId, card.cardId];
    const nextMoves = moves + 1;
    setSelectedIds([first.cardId, card.cardId]);
    setRevealedCardIds(nextHistory);
    setMoves(nextMoves);

    const isMatch = loadedContent.mode !== GameContentMode.NORMAL
      ? (await validateGameContentAction<{ match: boolean }>(
        loadedContent,
        "validate_pair",
        { cardIds: [first.cardId, card.cardId] },
      ).catch(() => ({ match: false }))).match
      : areMatchingMemoryCards(first, card);
    if (isMatch) {
      const nextMatched = [...matchedCardIds, first.cardId, card.cardId];
      setMatchedCardIds(nextMatched);
      setMessage("Par encontrado.");
      hideTimer.current = setTimeout(() => setSelectedIds([]), 250);
      if (nextMatched.length / 2 === content.pairCount) {
        setLocked(true);
        setMessage("Todos os pares foram encontrados. Registrando resultado…");
        try {
          await recordPlatformGameCompletion({
            gameId: "memoria-biblica",
            sessionId: sessionId.current,
            contentId: content.id,
            contentVersion: content.version,
            revealedCardIds: nextHistory,
          });
          setStatus("won");
          setMessage(`Todos os pares encontrados! Você fez ${memoryScore(nextMoves, content.pairCount)} pontos.`);
        } catch {
          setMatchedCardIds(matchedCardIds);
          setSelectedIds([]);
          setMessage("Não foi possível registrar o resultado. Encontre o último par novamente.");
        } finally {
          setLocked(false);
        }
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
    if (!content) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    sessionId.current = createGameSessionId();
    setDeck(shuffledCards(content.cards as MemoryCard[]));
    setSelectedIds([]);
    setMatchedCardIds([]);
    setRevealedCardIds([]);
    setMoves(0);
    setLocked(false);
    setStatus("playing");
    setMessage(`Encontre os ${content.pairCount} pares bíblicos.`);
  }

  const pairCount = content?.pairCount ?? 0;
  return (
    <GameLayout eyebrow="Exercite sua memória" title="Memória" highlightedTitle="Bíblica"
      description="Vire as cartas e encontre os pares relacionados à Bíblia."
      status={status} currentAttempt={matchedCardIds.length / 2} maxAttempts={pairCount || 1}
      progressLabel="Pares encontrados" gameType={GameType.MEMORY} mode={loadedContent?.mode} onRestart={restart}>
      <section className="memory-game" aria-label="Memória Bíblica" aria-busy={loading}>
        {loading && <p className="memory-message" role="status">Carregando Jogo da Memória...</p>}
        {loadError && <p className="memory-message" role="alert">Nenhum Jogo da Memória publicado está disponível agora.</p>}
        {content && !loading && !loadError && (
          <>
            <header className="memory-heading">
              <div>
                <span>Conjunto</span>
                <h2>{content.title}</h2>
                {content.biblicalReference && <small>{content.biblicalReference}</small>}
              </div>
              <p><strong>{matchedCardIds.length / 2}</strong> de {pairCount} pares · {moves} jogada(s)</p>
            </header>
            <div className="memory-board" role="group" aria-label={`Tabuleiro com ${deck.length} cartas`}>
              {deck.map(card => {
                const visible = selectedIds.includes(card.cardId) || matchedCardIds.includes(card.cardId);
                const matched = matchedCardIds.includes(card.cardId);
                return <button className={`memory-card${visible ? " is-visible" : ""}${matched ? " is-matched" : ""}`}
                  key={card.cardId} type="button" onClick={() => void reveal(card.cardId)}
                  disabled={status !== "playing" || locked || matched}
                  aria-label={visible ? card.label : "Carta oculta"} aria-pressed={visible}>
                  <span className="memory-card-back" aria-hidden="true">✦</span>
                  <span className="memory-card-front" aria-hidden={!visible}><small>{card.label}</small></span>
                </button>;
              })}
            </div>
            <p className={`memory-message ${status}`} role="status" aria-live="polite">{message}</p>
          </>
        )}
      </section>
    </GameLayout>
  );
}
