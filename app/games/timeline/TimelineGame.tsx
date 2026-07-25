"use client";

import { useRef, useState } from "react";
import {
  createGameSessionId,
  GameLayout,
  recordPlatformGameCompletion,
  type GamePlayStatus,
} from "../sdk";
import {
  isCorrectTimelineOrder,
  moveTimelineEvent,
  nextTimelineRoundIndex,
  shuffleTimelineEvents,
  timelineScore,
  TIMELINE_MAX_ATTEMPTS,
} from "./engine";
import { TIMELINE_ROUNDS } from "./rounds";

function shuffledRound(index: number) {
  return shuffleTimelineEvents(TIMELINE_ROUNDS[index].events);
}

export function TimelineGame() {
  const sessionId = useRef(createGameSessionId());
  const [roundIndex, setRoundIndex] = useState(0);
  const [events, setEvents] = useState(() => shuffledRound(0));
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [message, setMessage] = useState("Organize os acontecimentos do mais antigo para o mais recente.");
  const round = TIMELINE_ROUNDS[roundIndex];

  function move(index: number, direction: -1 | 1) {
    if (status !== "playing") return;
    setEvents(current => moveTimelineEvent(current, index, direction));
  }

  function confirmOrder() {
    if (status !== "playing") return;
    const nextAttempt = attemptsUsed + 1;
    const eventIds = events.map(event => event.id);
    const won = isCorrectTimelineOrder(round, eventIds);
    setAttemptsUsed(nextAttempt);

    if (won) {
      setStatus("won");
      setMessage(`Sequência correta! Você fez ${timelineScore(nextAttempt)} pontos.`);
    } else if (nextAttempt >= TIMELINE_MAX_ATTEMPTS) {
      setStatus("lost");
      setMessage("A ordem ainda não estava correta. Reinicie para tentar uma nova sequência.");
    } else {
      setMessage(`A sequência ainda não está correta. Restam ${TIMELINE_MAX_ATTEMPTS - nextAttempt} tentativa(s).`);
      return;
    }

    void recordPlatformGameCompletion({
      gameId: "linha-do-tempo-biblica",
      sessionId: sessionId.current,
      roundId: round.id,
      orderedEventIds: eventIds,
      attemptsUsed: nextAttempt,
    }).catch(() => undefined);
  }

  function restart() {
    const nextRound = nextTimelineRoundIndex(roundIndex, TIMELINE_ROUNDS.length);
    sessionId.current = createGameSessionId();
    setRoundIndex(nextRound);
    setEvents(shuffledRound(nextRound));
    setAttemptsUsed(0);
    setStatus("playing");
    setMessage("Organize os acontecimentos do mais antigo para o mais recente.");
  }

  return (
    <GameLayout
      eyebrow="Organize a história"
      title="Linha do Tempo"
      highlightedTitle="Bíblica"
      description="Coloque os acontecimentos na ordem em que ocorreram."
      status={status}
      currentAttempt={status === "playing"
        ? Math.min(attemptsUsed + 1, TIMELINE_MAX_ATTEMPTS)
        : attemptsUsed}
      maxAttempts={TIMELINE_MAX_ATTEMPTS}
      onRestart={restart}
    >
      <section className="timeline-game" aria-label="Linha do Tempo Bíblica">
        <header className="timeline-round-heading">
          <span>Tema da sequência</span>
          <h2>{round.title}</h2>
        </header>

        <ol className="timeline-event-list" aria-label="Acontecimentos para ordenar">
          {events.map((event, index) => (
            <li key={event.id}>
              <span className="timeline-position" aria-hidden="true">{index + 1}</span>
              <p>{event.title}</p>
              <div className="timeline-controls">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={status !== "playing" || index === 0}
                  aria-label={`Mover ${event.title} para cima`}
                >↑</button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={status !== "playing" || index === events.length - 1}
                  aria-label={`Mover ${event.title} para baixo`}
                >↓</button>
              </div>
            </li>
          ))}
        </ol>

        {status === "playing" && (
          <button className="timeline-confirm" type="button" onClick={confirmOrder}>
            Confirmar ordem
          </button>
        )}
        <p className={`timeline-message ${status}`} role="status" aria-live="polite">{message}</p>
      </section>
    </GameLayout>
  );
}
