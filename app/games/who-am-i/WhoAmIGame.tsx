"use client";

import { useRef, useState } from "react";
import { createGameSessionId, GameLayout, recordPlatformGameCompletion } from "../sdk";
import {
  applyWhoAmIAction,
  initialWhoAmIState,
  nextWhoAmICharacterIndex,
  shuffleWhoAmIOptions,
  type WhoAmIAction,
} from "./engine";
import { WHO_AM_I_CHARACTERS, whoAmIOptionName } from "./characters";

export function WhoAmIGame() {
  const sessionId = useRef(createGameSessionId());
  const completionRecorded = useRef(false);
  const [characterIndex, setCharacterIndex] = useState(0);
  const character = WHO_AM_I_CHARACTERS[characterIndex];
  const [options, setOptions] = useState(() => shuffleWhoAmIOptions(character.optionIds));
  const [gameState, setGameState] = useState(initialWhoAmIState);
  const [actions, setActions] = useState<WhoAmIAction[]>([]);
  const [lastWrongAnswerId, setLastWrongAnswerId] = useState<string | null>(null);
  const [message, setMessage] = useState("Leia a primeira dica e escolha quando estiver pronto.");

  function registerCompletion(nextActions: WhoAmIAction[]) {
    if (completionRecorded.current) return;
    completionRecorded.current = true;
    void recordPlatformGameCompletion({
      gameId: "quem-sou-eu",
      sessionId: sessionId.current,
      characterId: character.id,
      actions: nextActions,
    }).catch(() => undefined);
  }

  function revealHint() {
    if (gameState.status !== "playing" || gameState.hintsVisible >= character.hints.length) return;
    const action = { type: "reveal" } as const;
    const nextState = applyWhoAmIAction(character, gameState, action);
    setActions(current => [...current, action]);
    setGameState(nextState);
    setLastWrongAnswerId(null);
    setMessage(`Dica ${nextState.hintsVisible} de ${character.hints.length} revelada.`);
  }

  function answer(answerId: string) {
    if (gameState.status !== "playing" || gameState.awaitingNextHint) return;
    const action = { type: "guess", answerId } as const;
    const nextState = applyWhoAmIAction(character, gameState, action);
    const nextActions = [...actions, action];
    setActions(nextActions);
    setGameState(nextState);
    if (nextState.status === "won") {
      setMessage(`Resposta correta: ${character.name}!`);
      registerCompletion(nextActions);
    } else if (nextState.status === "lost") {
      setLastWrongAnswerId(answerId);
      setMessage(`Fim de jogo. O personagem era ${character.name}.`);
      registerCompletion(nextActions);
    } else {
      setLastWrongAnswerId(answerId);
      setMessage("Essa não é a resposta. Revele a próxima dica para continuar.");
    }
  }

  function restart() {
    const nextIndex = nextWhoAmICharacterIndex(characterIndex, WHO_AM_I_CHARACTERS.length);
    const nextCharacter = WHO_AM_I_CHARACTERS[nextIndex];
    sessionId.current = createGameSessionId();
    completionRecorded.current = false;
    setCharacterIndex(nextIndex);
    setOptions(shuffleWhoAmIOptions(nextCharacter.optionIds));
    setGameState(initialWhoAmIState());
    setActions([]);
    setLastWrongAnswerId(null);
    setMessage("Leia a primeira dica e escolha quando estiver pronto.");
  }

  return (
    <GameLayout eyebrow="Descubra o personagem" title="Quem Sou" highlightedTitle="Eu?"
      description="Use as dicas para identificar um personagem bíblico."
      status={gameState.status} currentAttempt={gameState.hintsVisible}
      maxAttempts={character.hints.length} progressLabel="Dicas reveladas" onRestart={restart}>
      <section className="who-am-i-game" aria-label="Quem Sou Eu?">
        <header className="who-am-i-heading">
          <span>Personagem secreto</span>
          <h2>Dica {gameState.hintsVisible} de {character.hints.length}</h2>
        </header>
        <ol className="who-am-i-hints" aria-label="Dicas reveladas">
          {character.hints.slice(0, gameState.hintsVisible).map((hint, index) => (
            <li key={hint} className={index === gameState.hintsVisible - 1 ? "is-current" : ""}>
              <span>{index + 1}</span><p>{hint}</p>
            </li>
          ))}
        </ol>
        {gameState.status === "playing" && gameState.hintsVisible < character.hints.length && (
          <button className="who-am-i-reveal" type="button" onClick={revealHint}>
            Mostrar próxima dica
          </button>
        )}
        <div className="who-am-i-options" role="group" aria-label="Alternativas">
          {options.map(optionId => {
            const wrong = gameState.wrongAnswerIds.includes(optionId);
            const correct = gameState.status === "won" && optionId === character.id;
            return <button key={optionId} type="button" onClick={() => answer(optionId)}
              disabled={gameState.status !== "playing" || gameState.awaitingNextHint || wrong}
              className={`${lastWrongAnswerId === optionId ? "is-wrong " : ""}${correct ? "is-correct" : ""}`}>
              {whoAmIOptionName(optionId)}
            </button>;
          })}
        </div>
        <p className={`who-am-i-message ${gameState.status}`} role="status" aria-live="polite">{message}</p>
      </section>
    </GameLayout>
  );
}
