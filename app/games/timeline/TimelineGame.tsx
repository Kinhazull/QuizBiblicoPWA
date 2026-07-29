"use client";

import { useEffect, useRef, useState } from "react";
import {
  createGameSessionId,
  GameLayout,
  recordPlatformGameCompletion,
  type GamePlayStatus,
} from "../sdk";
import {
  moveTimelineEvent,
  shuffleTimelineEvents,
  timelineScore,
  TIMELINE_MAX_ATTEMPTS,
} from "./engine";

type PublishedTimelineEvent = {
  id: string;
  title: string;
  description: string | null;
};

type PublishedTimeline = {
  id: string;
  title: string;
  events: PublishedTimelineEvent[];
  version: number;
  biblicalReference: string | null;
};

export function TimelineGame() {
  const sessionId = useRef(createGameSessionId());
  const [round, setRound] = useState<PublishedTimeline | null>(null);
  const [events, setEvents] = useState<PublishedTimelineEvent[]>([]);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("Organize os acontecimentos do mais antigo para o mais recente.");

  useEffect(() => {
    const controller = new AbortController();
    async function loadTimeline() {
      setLoading(true);
      setLoadError(false);
      try {
        const response = await fetch("/api/platform/games/timeline", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("timeline_content_unavailable");
        const data = await response.json() as { content: PublishedTimeline };
        setRound(data.content);
        setEvents(shuffleTimelineEvents(data.content.events));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadTimeline();
    return () => controller.abort();
  }, []);

  function move(index: number, direction: -1 | 1) {
    if (status !== "playing") return;
    setEvents(current => moveTimelineEvent(current, index, direction));
  }

  async function confirmOrder() {
    if (status !== "playing" || !round || validating) return;
    const nextAttempt = attemptsUsed + 1;
    const eventIds = events.map(event => event.id);
    setValidating(true);
    let won = false;
    try {
      const response = await fetch("/api/platform/games/timeline", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentId: round.id,
          contentVersion: round.version,
          orderedEventIds: eventIds,
        }),
      });
      if (!response.ok) throw new Error("timeline_validation_failed");
      const data = await response.json() as { correct: boolean };
      won = data.correct === true;
      setAttemptsUsed(nextAttempt);
    } catch {
      setMessage("Não foi possível validar a sequência. Tente novamente.");
      return;
    } finally {
      setValidating(false);
    }

    if (won) {
      setStatus("won");
      setMessage(`Sequência correta! Você fez ${timelineScore(nextAttempt)} pontos.`);
    } else if (nextAttempt >= TIMELINE_MAX_ATTEMPTS) {
      setStatus("lost");
      setMessage("A ordem ainda não estava correta. Reinicie para tentar novamente.");
    } else {
      setMessage(`A sequência ainda não está correta. Restam ${TIMELINE_MAX_ATTEMPTS - nextAttempt} tentativa(s).`);
      return;
    }

    await recordPlatformGameCompletion({
      gameId: "linha-do-tempo-biblica",
      sessionId: sessionId.current,
      contentId: round.id,
      contentVersion: round.version,
      orderedEventIds: eventIds,
      attemptsUsed: nextAttempt,
    }).catch(() => undefined);
  }

  function restart() {
    if (!round) return;
    sessionId.current = createGameSessionId();
    setEvents(shuffleTimelineEvents(round.events));
    setAttemptsUsed(0);
    setValidating(false);
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
      <section className="timeline-game" aria-label="Linha do Tempo Bíblica" aria-busy={loading}>
        {loading && <p className="timeline-message" role="status">Carregando Linha do Tempo...</p>}
        {loadError && (
          <p className="timeline-message lost" role="alert">
            Nenhuma Linha do Tempo publicada está disponível agora.
          </p>
        )}
        {round && !loading && !loadError && (
          <>
            <header className="timeline-round-heading">
              <span>Tema da sequência</span>
              <h2>{round.title}</h2>
              {round.biblicalReference && <p>{round.biblicalReference}</p>}
            </header>

            <ol className="timeline-event-list" aria-label="Acontecimentos para ordenar">
              {events.map((event, index) => (
                <li key={event.id}>
                  <span className="timeline-position" aria-hidden="true">{index + 1}</span>
                  <div className="timeline-event-copy">
                    <p>{event.title}</p>
                    {event.description && <small>{event.description}</small>}
                  </div>
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
              <button className="timeline-confirm" type="button" onClick={confirmOrder} disabled={validating}>
                {validating ? "Validando..." : "Confirmar ordem"}
              </button>
            )}
            <p className={`timeline-message ${status}`} role="status" aria-live="polite">{message}</p>
          </>
        )}
      </section>
    </GameLayout>
  );
}
