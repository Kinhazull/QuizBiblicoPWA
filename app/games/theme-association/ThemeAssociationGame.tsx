"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createGameSessionId, GameInstruction, GameLayout, recordPlatformGameCompletion, type GamePlayStatus } from "../sdk";
import { gameContentRequestFromLocation, loadGameContent, validateGameContentAction } from "../loader";
import type { LoadedGameContent } from "../loader";
import { GameType } from "../../../shared/content";
import { THEME_ASSOCIATION_MAX_ERRORS, type ThemeAssociationAttempt } from "./engine";

type AssociationItem = { id: string; label: string; category?: string | null };
type PublishedAssociation = {
  id: string;
  version: number;
  title: string;
  leftItems: AssociationItem[];
  rightItems: AssociationItem[];
  pairCount: number;
  biblicalReference: string | null;
};

export function ThemeAssociationGame() {
  const sessionId = useRef(createGameSessionId());
  const completionRecorded = useRef(false);
  const [content, setContent] = useState<PublishedAssociation | null>(null);
  const [loadedContent, setLoadedContent] = useState<LoadedGameContent<PublishedAssociation> | null>(null);
  const [attempts, setAttempts] = useState<ThemeAssociationAttempt[]>([]);
  const [matchedLeftIds, setMatchedLeftIds] = useState<string[]>([]);
  const [matchedRightIds, setMatchedRightIds] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [incorrectIds, setIncorrectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("Selecione um item de cada coluna para formar um par.");

  const loadContent = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const loaded = await loadGameContent<PublishedAssociation>({
        ...gameContentRequestFromLocation(GameType.ASSOCIATION),
        signal,
      });
      setLoadedContent(loaded);
      setContent(loaded.payload);
      setMessage(`Associe corretamente os ${loaded.payload.pairCount} pares.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadContent(controller.signal);
    return () => controller.abort();
  }, [loadContent]);

  async function registerCompletion(nextAttempts: ThemeAssociationAttempt[], nextStatus: GamePlayStatus) {
    if (!content || completionRecorded.current) return;
    completionRecorded.current = true;
    setStatus(nextStatus);
    setMessage(nextStatus === "won"
      ? "Todos os pares foram associados corretamente!"
      : "O limite de três erros foi atingido. Reinicie para tentar novamente.");
    try {
      await recordPlatformGameCompletion({
        gameId: "associacao-de-temas",
        sessionId: sessionId.current,
        contentId: content.id,
        contentVersion: content.version,
        attempts: nextAttempts,
      });
    } catch {
      setMessage("A partida terminou, mas não foi possível registrar o resultado. Tente novamente.");
    }
  }

  async function resolvePair(leftId: string, rightId: string) {
    if (!content || !loadedContent || locked || status !== "playing") return;
    setLocked(true);
    const attempt = { leftId, rightId };
    try {
      const result = await validateGameContentAction<{ correct: boolean }>(
        loadedContent,
        "validate_pair",
        { leftId, rightId },
      );
      const nextAttempts = [...attempts, attempt];
      setAttempts(nextAttempts);
      if (result.correct) {
        const nextLeft = [...matchedLeftIds, leftId];
        const nextRight = [...matchedRightIds, rightId];
        setMatchedLeftIds(nextLeft);
        setMatchedRightIds(nextRight);
        setSelectedLeftId(null);
        setSelectedRightId(null);
        setMessage("Par correto! Continue associando.");
        if (nextLeft.length === content.pairCount) await registerCompletion(nextAttempts, "won");
      } else {
        const nextErrors = errors + 1;
        setErrors(nextErrors);
        setIncorrectIds([leftId, rightId]);
        setMessage(`Associação incorreta. Restam ${Math.max(0, THEME_ASSOCIATION_MAX_ERRORS - nextErrors)} erro(s).`);
        if (nextErrors >= THEME_ASSOCIATION_MAX_ERRORS) await registerCompletion(nextAttempts, "lost");
        await new Promise(resolve => setTimeout(resolve, 420));
        setIncorrectIds([]);
        setSelectedLeftId(null);
        setSelectedRightId(null);
      }
    } catch {
      setMessage("Não foi possível validar esta associação. Tente novamente.");
    } finally {
      setLocked(false);
    }
  }

  function chooseLeft(itemId: string) {
    if (locked || status !== "playing" || matchedLeftIds.includes(itemId)) return;
    setSelectedLeftId(itemId);
    if (selectedRightId) void resolvePair(itemId, selectedRightId);
  }

  function chooseRight(itemId: string) {
    if (locked || status !== "playing" || matchedRightIds.includes(itemId)) return;
    setSelectedRightId(itemId);
    if (selectedLeftId) void resolvePair(selectedLeftId, itemId);
  }

  function restart() {
    sessionId.current = createGameSessionId();
    completionRecorded.current = false;
    setAttempts([]);
    setMatchedLeftIds([]);
    setMatchedRightIds([]);
    setErrors(0);
    setStatus("playing");
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setIncorrectIds([]);
    setLocked(false);
    setMessage("Selecione um item de cada coluna para formar um par.");
    void loadContent();
  }

  const pairCount = content?.pairCount ?? 0;
  const roundTitle = content?.title && !/^Associações bíblicas\s+\d+$/i.test(content.title)
    ? content.title
    : "Rodada de associações";
  return (
    <GameLayout eyebrow="Conecte os conhecimentos" title="Associação de" highlightedTitle="Temas"
      description="Combine cada item bíblico com sua associação correta."
      status={status} currentAttempt={matchedLeftIds.length}
      maxAttempts={pairCount || 1} progressLabel="Pares encontrados"
      gameType={GameType.ASSOCIATION} mode={loadedContent?.mode} onRestart={restart}>
      <section className="theme-association-game" aria-label="Associação de Temas" aria-busy={loading}>
        {loading && <p className="theme-association-message" role="status">Carregando Associação de Temas...</p>}
        {loadError && <p className="theme-association-message" role="alert">Nenhuma Associação publicada está disponível agora.</p>}
        {content && !loading && !loadError && (
          <>
            <header className="theme-association-heading">
              <div>
                <span>Tema da rodada</span><h2>{roundTitle}</h2>
              </div>
              <p><strong>{errors}</strong> de {THEME_ASSOCIATION_MAX_ERRORS} erros</p>
            </header>
            <div className="theme-association-board">
              <div className="theme-association-column" role="group" aria-label="Primeiro grupo">
                <h3>Escolha uma referência</h3>
                {content.leftItems.map(item => {
                  const matched = matchedLeftIds.includes(item.id);
                  return <button key={item.id} type="button" onClick={() => chooseLeft(item.id)}
                    disabled={locked || matched || status !== "playing"}
                    aria-pressed={selectedLeftId === item.id}
                    className={`${selectedLeftId === item.id ? "is-selected " : ""}${matched ? "is-matched " : ""}${incorrectIds.includes(item.id) ? "is-incorrect" : ""}`}>
                    {item.category && <small>{item.category}</small>}<span>{item.label}</span>
                  </button>;
                })}
              </div>
              <div className="theme-association-column" role="group" aria-label="Segundo grupo">
                <h3>Encontre a relação</h3>
                {content.rightItems.map(item => {
                  const matched = matchedRightIds.includes(item.id);
                  return <button key={item.id} type="button" onClick={() => chooseRight(item.id)}
                    disabled={locked || matched || status !== "playing"}
                    aria-pressed={selectedRightId === item.id}
                    className={`${selectedRightId === item.id ? "is-selected " : ""}${matched ? "is-matched " : ""}${incorrectIds.includes(item.id) ? "is-incorrect" : ""}`}>
                    <span>{item.label}</span>
                  </button>;
                })}
              </div>
            </div>
            <GameInstruction>Escolha um elemento de cada coluna. Uma borda verde confirma o par; uma borda vermelha indica tentativa incorreta.</GameInstruction>
            <p className={`theme-association-message ${status}`} role="status" aria-live="polite">{message}</p>
          </>
        )}
      </section>
    </GameLayout>
  );
}
