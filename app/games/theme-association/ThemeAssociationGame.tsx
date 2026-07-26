"use client";

import { useEffect, useRef, useState } from "react";
import { createGameSessionId, GameLayout, recordPlatformGameCompletion, type GamePlayStatus } from "../sdk";
import {
  applyThemeAssociationAttempt,
  initialThemeAssociationState,
  nextThemeAssociationRoundIndex,
  shuffleThemeAssociationOptions,
  THEME_ASSOCIATION_MAX_ERRORS,
  type ThemeAssociationAttempt,
} from "./engine";
import { THEME_ASSOCIATION_ROUNDS } from "./rounds";

const ERROR_FEEDBACK_MS = 550;

export function ThemeAssociationGame() {
  const sessionId = useRef(createGameSessionId());
  const completionRecorded = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const round = THEME_ASSOCIATION_ROUNDS[roundIndex];
  const [rightOptions, setRightOptions] = useState(() => shuffleThemeAssociationOptions(round.pairs));
  const [gameState, setGameState] = useState(initialThemeAssociationState);
  const [attempts, setAttempts] = useState<ThemeAssociationAttempt[]>([]);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [incorrectIds, setIncorrectIds] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("Selecione um item de cada coluna para formar um par.");

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  function registerCompletion(nextAttempts: ThemeAssociationAttempt[], status: GamePlayStatus) {
    if (completionRecorded.current) return;
    completionRecorded.current = true;
    void recordPlatformGameCompletion({
      gameId: "associacao-de-temas",
      sessionId: sessionId.current,
      roundId: round.id,
      attempts: nextAttempts,
    }).catch(() => undefined);
    setMessage(status === "won"
      ? "Todos os pares foram associados corretamente!"
      : "O limite de três erros foi atingido. Reinicie para tentar novamente.");
  }

  function resolvePair(leftId: string, rightId: string) {
    if (locked || gameState.status !== "playing") return;
    const attempt = { leftId, rightId };
    const nextAttempts = [...attempts, attempt];
    const nextState = applyThemeAssociationAttempt(round, gameState, attempt);
    setAttempts(nextAttempts);
    setGameState(nextState);

    if (leftId === rightId) {
      setSelectedLeftId(null);
      setSelectedRightId(null);
      if (nextState.status === "won") registerCompletion(nextAttempts, "won");
      else setMessage("Par correto! Continue associando.");
      return;
    }

    setSelectedLeftId(leftId);
    setSelectedRightId(rightId);
    setIncorrectIds([leftId, rightId]);
    setLocked(true);
    if (nextState.status === "lost") registerCompletion(nextAttempts, "lost");
    else setMessage(`Associação incorreta. Restam ${THEME_ASSOCIATION_MAX_ERRORS - nextState.errors} erro(s).`);
    feedbackTimer.current = setTimeout(() => {
      setSelectedLeftId(null);
      setSelectedRightId(null);
      setIncorrectIds([]);
      setLocked(false);
    }, ERROR_FEEDBACK_MS);
  }

  function chooseLeft(pairId: string) {
    if (locked || gameState.status !== "playing" || gameState.matchedPairIds.includes(pairId)) return;
    setSelectedLeftId(pairId);
    if (selectedRightId) resolvePair(pairId, selectedRightId);
  }

  function chooseRight(pairId: string) {
    if (locked || gameState.status !== "playing" || gameState.matchedPairIds.includes(pairId)) return;
    setSelectedRightId(pairId);
    if (selectedLeftId) resolvePair(selectedLeftId, pairId);
  }

  function restart() {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    const nextIndex = nextThemeAssociationRoundIndex(roundIndex, THEME_ASSOCIATION_ROUNDS.length);
    const nextRound = THEME_ASSOCIATION_ROUNDS[nextIndex];
    sessionId.current = createGameSessionId();
    completionRecorded.current = false;
    setRoundIndex(nextIndex);
    setRightOptions(shuffleThemeAssociationOptions(nextRound.pairs));
    setGameState(initialThemeAssociationState());
    setAttempts([]);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setIncorrectIds([]);
    setLocked(false);
    setMessage("Selecione um item de cada coluna para formar um par.");
  }

  return (
    <GameLayout eyebrow="Conecte os conhecimentos" title="Associação de" highlightedTitle="Temas"
      description="Combine cada item bíblico com sua associação correta."
      status={gameState.status} currentAttempt={gameState.matchedPairIds.length}
      maxAttempts={round.pairs.length} progressLabel="Pares encontrados" onRestart={restart}>
      <section className="theme-association-game" aria-label="Associação de Temas">
        <header className="theme-association-heading">
          <div><span>Rodada</span><h2>{round.title}</h2></div>
          <p><strong>{gameState.errors}</strong> de {THEME_ASSOCIATION_MAX_ERRORS} erros</p>
        </header>
        <div className="theme-association-board">
          <div className="theme-association-column" role="group" aria-label="Itens bíblicos">
            <h3>Itens</h3>
            {round.pairs.map(pair => {
              const matched = gameState.matchedPairIds.includes(pair.id);
              return <button key={pair.id} type="button" onClick={() => chooseLeft(pair.id)}
                disabled={locked || matched || gameState.status !== "playing"}
                aria-pressed={selectedLeftId === pair.id}
                className={`${selectedLeftId === pair.id ? "is-selected " : ""}${matched ? "is-matched " : ""}${incorrectIds.includes(pair.id) ? "is-incorrect" : ""}`}>
                <small>{pair.category}</small><span>{pair.left}</span>
              </button>;
            })}
          </div>
          <div className="theme-association-column" role="group" aria-label="Opções de associação">
            <h3>Associações</h3>
            {rightOptions.map(pair => {
              const matched = gameState.matchedPairIds.includes(pair.id);
              return <button key={pair.id} type="button" onClick={() => chooseRight(pair.id)}
                disabled={locked || matched || gameState.status !== "playing"}
                aria-pressed={selectedRightId === pair.id}
                className={`${selectedRightId === pair.id ? "is-selected " : ""}${matched ? "is-matched " : ""}${incorrectIds.includes(pair.id) ? "is-incorrect" : ""}`}>
                <span>{pair.right}</span>
              </button>;
            })}
          </div>
        </div>
        <p className={`theme-association-message ${gameState.status}`} role="status" aria-live="polite">{message}</p>
      </section>
    </GameLayout>
  );
}
