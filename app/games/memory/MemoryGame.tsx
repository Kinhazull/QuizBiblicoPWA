"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createGameSessionId, GameInstruction, GameLayout, recordPlatformGameCompletion, type GamePlayStatus } from "../sdk";
import {
  GameContentMode,
  gameContentRequestFromLocation,
  loadGameContent,
  validateGameContentAction,
  type LoadedGameContent,
} from "../loader";
import { areMatchingMemoryCards, claimMemoryCard, emptyMemoryTurnGate, memoryScore, type MemoryCard } from "./engine";
import { GameType } from "../../../shared/content";

const HIDE_DELAY_MS = 650;

type PublishedMemory = {
  id: string;
  version: number;
  title: string;
  cards: Array<MemoryCard | { id: string; label: string; assetUrl?: string | null; altText?: string | null }>;
  pairCount: number;
  biblicalReference: string | null;
};
type MemoryDisplayCard = MemoryCard & { assetUrl?: string | null; altText?: string | null };

function shuffledCards(cards: readonly MemoryDisplayCard[]) {
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
  const turnGate = useRef(emptyMemoryTurnGate());
  const matchedRef = useRef<string[]>([]);
  const historyRef = useRef<string[]>([]);
  const movesRef = useRef(0);
  const [content, setContent] = useState<PublishedMemory | null>(null);
  const [loadedContent, setLoadedContent] = useState<LoadedGameContent<PublishedMemory> | null>(null);
  const [deck, setDeck] = useState<MemoryDisplayCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);
  const [, setRevealedCardIds] = useState<string[]>([]);
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
            : { cardId: card.id, pairId: "", label: card.label, assetUrl: card.assetUrl, altText: card.altText }),
        };
        setLoadedContent(loaded);
        setContent(normalized);
        setDeck(shuffledCards(normalized.cards as MemoryDisplayCard[]));
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
    if (!content || !loadedContent || status !== "playing") return;
    const card = deck.find(item => item.cardId === cardId);
    if (!card || matchedRef.current.includes(card.cardId)) return;
    const claim = claimMemoryCard(turnGate.current, cardId);
    if (claim.kind === "ignored") return;
    turnGate.current = claim.gate;
    if (claim.kind === "first") return setSelectedIds([cardId]);

    const first = deck.find(item => item.cardId === claim.firstCardId);
    if (!first) { turnGate.current = emptyMemoryTurnGate(); return; }
    const previousHistory = historyRef.current;
    const previousMatched = matchedRef.current;
    const previousMoves = movesRef.current;
    const nextHistory = [...previousHistory, first.cardId, card.cardId];
    const nextMoves = previousMoves + 1;
    setLocked(true);
    setSelectedIds([first.cardId, card.cardId]);
    historyRef.current = nextHistory;
    movesRef.current = nextMoves;
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
      const nextMatched = [...previousMatched, first.cardId, card.cardId];
      matchedRef.current = nextMatched;
      setMatchedCardIds(nextMatched);
      setMessage("Par encontrado.");
      if (nextMatched.length / 2 === content.pairCount) {
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
          setLocked(false);
        } catch {
          matchedRef.current = previousMatched;
          historyRef.current = previousHistory;
          movesRef.current = previousMoves;
          setMatchedCardIds(previousMatched);
          setRevealedCardIds(previousHistory);
          setMoves(previousMoves);
          setSelectedIds([]);
          turnGate.current = emptyMemoryTurnGate();
          setLocked(false);
          setMessage("Não foi possível registrar o resultado. Encontre o último par novamente.");
        }
      } else {
        hideTimer.current = setTimeout(() => {
          turnGate.current = emptyMemoryTurnGate();
          setSelectedIds([]);
          setLocked(false);
        }, 250);
      }
      return;
    }
    setMessage("Essas cartas não formam um par. Continue tentando.");
    hideTimer.current = setTimeout(() => {
      turnGate.current = emptyMemoryTurnGate();
      setSelectedIds([]);
      setLocked(false);
    }, HIDE_DELAY_MS);
  }

  function restart() {
    if (!content) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    sessionId.current = createGameSessionId();
    setDeck(shuffledCards(content.cards as MemoryDisplayCard[]));
    setSelectedIds([]);
    turnGate.current = emptyMemoryTurnGate();
    matchedRef.current = [];
    historyRef.current = [];
    movesRef.current = 0;
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
        {loading && <p className="memory-message" role="status">Embaralhando as cartas…</p>}
        {loadError && <p className="memory-message" role="alert">Estamos preparando novos conjuntos de Memória. Tente novamente em instantes.</p>}
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
                  <span className="memory-card-front" aria-hidden={!visible}>
                    {"assetUrl" in card && card.assetUrl
                      ? <Image src={card.assetUrl} alt={card.altText || card.label} fill sizes="(max-width: 430px) 22vw, 130px" unoptimized />
                      : <small>{card.label}</small>}
                  </span>
                </button>;
              })}
            </div>
            <GameInstruction>Vire duas cartas por vez. Pares encontrados permanecem abertos.</GameInstruction>
            <p className={`memory-message ${status}`} role="status" aria-live="polite">{message}</p>
          </>
        )}
      </section>
    </GameLayout>
  );
}
