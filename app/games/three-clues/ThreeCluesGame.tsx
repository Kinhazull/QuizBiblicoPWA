"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createGameSessionId, GameLayout, recordPlatformGameCompletion, type GamePlayStatus } from "../sdk";
import { gameContentRequestFromLocation, loadGameContent, validateGameContentAction } from "../loader";
import type { LoadedGameContent } from "../loader";
import { GameType } from "../../../shared/content";
import {
  scoreForCluesUsed,
  THREE_CLUES_MAX,
  type ThreeCluesAction,
  type ThreeCluesChallengeHistory,
} from "./engine";

type PublishedChallenge = { id: string; clues: [string, string, string] };
type PublishedThreeClues = {
  id: string;
  version: number;
  title: string;
  challenges: PublishedChallenge[];
  biblicalReference: string | null;
};

export function ThreeCluesGame() {
  const sessionId = useRef(createGameSessionId());
  const completionRecorded = useRef(false);
  const [content, setContent] = useState<PublishedThreeClues | null>(null);
  const [loadedContent, setLoadedContent] = useState<LoadedGameContent<PublishedThreeClues> | null>(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [actions, setActions] = useState<ThreeCluesAction[]>([]);
  const [histories, setHistories] = useState<ThreeCluesChallengeHistory[]>([]);
  const [answer, setAnswer] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState("Leia a primeira pista e responda quando estiver pronto.");

  const loadContent = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const loaded = await loadGameContent<PublishedThreeClues>({
        ...gameContentRequestFromLocation(GameType.THREE_CLUES),
        signal,
      });
      setLoadedContent(loaded);
      setContent(loaded.payload);
      setMessage(`Desafio 1 de ${loaded.payload.challenges.length}. Leia a primeira pista.`);
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

  const challenge = content?.challenges[challengeIndex] ?? null;

  function revealNextClue() {
    if (!challenge || status !== "playing" || revealedClues >= THREE_CLUES_MAX || validating) return;
    const next = revealedClues + 1;
    setRevealedClues(next);
    setActions(current => [...current, { type: "reveal" }]);
    setMessage(`Pista ${next} de ${THREE_CLUES_MAX} revelada.`);
  }

  async function registerCompletion(
    nextHistories: ThreeCluesChallengeHistory[],
    wonCount: number,
    totalScore: number,
  ) {
    if (!content || completionRecorded.current) return;
    completionRecorded.current = true;
    setStatus(wonCount > 0 ? "won" : "lost");
    setScore(totalScore);
    setMessage(`Conjunto concluído: ${wonCount} de ${content.challenges.length} resposta(s) correta(s).`);
    try {
      await recordPlatformGameCompletion({
        gameId: "jogo-tres-pistas",
        sessionId: sessionId.current,
        contentId: content.id,
        contentVersion: content.version,
        challenges: nextHistories.map(history => ({
          challengeId: history.challengeId,
          actions: [...history.actions],
        })),
      });
    } catch {
      setMessage("O conjunto terminou, mas não foi possível registrar o resultado. Tente novamente.");
    }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content || !loadedContent || !challenge || !answer.trim() || validating || status !== "playing") return;
    setValidating(true);
    try {
      const result = await validateGameContentAction<{ correct: boolean }>(
        loadedContent,
        "validate_answer",
        { challengeId: challenge.id, answer },
      );
      const challengeActions: ThreeCluesAction[] = [...actions, { type: "guess", answer }];
      const nextHistories = [...histories, { challengeId: challenge.id, actions: challengeActions }];
      const nextCorrectCount = correctCount + (result.correct ? 1 : 0);
      const nextScore = score + (result.correct ? scoreForCluesUsed(revealedClues) : 0);
      setHistories(nextHistories);
      setCorrectCount(nextCorrectCount);
      setScore(nextScore);
      setAnswer("");
      if (challengeIndex === content.challenges.length - 1) {
        await registerCompletion(nextHistories, nextCorrectCount, nextScore);
      } else {
        const nextIndex = challengeIndex + 1;
        setChallengeIndex(nextIndex);
        setRevealedClues(1);
        setActions([]);
        setMessage(`${result.correct ? "Resposta correta!" : "Resposta incorreta."} Desafio ${nextIndex + 1} de ${content.challenges.length}.`);
      }
    } catch {
      setMessage("Não foi possível validar a resposta. Tente novamente.");
    } finally {
      setValidating(false);
    }
  }

  function restart() {
    sessionId.current = createGameSessionId();
    completionRecorded.current = false;
    setChallengeIndex(0);
    setRevealedClues(1);
    setActions([]);
    setHistories([]);
    setAnswer("");
    setCorrectCount(0);
    setScore(0);
    setStatus("playing");
    setValidating(false);
    setMessage("Leia a primeira pista e responda quando estiver pronto.");
    void loadContent();
  }

  const challengeCount = content?.challenges.length ?? 0;
  return (
    <GameLayout
      eyebrow="Adivinhe com sabedoria"
      title="Jogo das"
      highlightedTitle="3 Pistas"
      description="Descubra respostas bíblicas usando o menor número de pistas."
      status={status}
      currentAttempt={Math.min(challengeIndex + 1, challengeCount || 1)}
      maxAttempts={challengeCount || 1}
      progressLabel="Desafios"
      onRestart={restart}
    >
      <section className="three-clues-game" aria-label="Jogo das 3 Pistas" aria-busy={loading || validating}>
        {loading && <p className="three-clues-message" role="status">Carregando Três Pistas...</p>}
        {loadError && <p className="three-clues-message" role="alert">Nenhum conjunto Três Pistas publicado está disponível agora.</p>}
        {content && challenge && !loading && !loadError && (
          <>
            <header className="three-clues-score">
              <span>{content.title}</span>
              <strong>Desafio {challengeIndex + 1} de {challengeCount}</strong>
              {content.biblicalReference && <small>{content.biblicalReference}</small>}
            </header>
            <ol className="three-clues-list" aria-label="Pistas reveladas">
              {challenge.clues.map((clue, index) => {
                const visible = index < revealedClues;
                return (
                  <li className={visible ? "visible" : "hidden"} key={`${challenge.id}:${index}`}>
                    <span>{index + 1}</span>
                    <p>{visible ? clue : "Pista ainda não revelada"}</p>
                  </li>
                );
              })}
            </ol>
            {status === "playing" && (
              <>
                <button className="three-clues-reveal" type="button" onClick={revealNextClue}
                  disabled={revealedClues === THREE_CLUES_MAX || validating}>
                  {revealedClues === THREE_CLUES_MAX ? "Todas as pistas reveladas" : "Revelar próxima pista"}
                </button>
                <form className="three-clues-answer" onSubmit={submitAnswer}>
                  <label htmlFor="three-clues-answer">Qual é a resposta?</label>
                  <div>
                    <input id="three-clues-answer" value={answer} onChange={event => setAnswer(event.target.value)}
                      autoComplete="off" maxLength={100} disabled={validating} placeholder="Digite sua resposta" />
                    <button type="submit" disabled={validating || !answer.trim()}>
                      {validating ? "Validando..." : "Responder"}
                    </button>
                  </div>
                </form>
              </>
            )}
            <p className={`three-clues-message ${status}`} role="status" aria-live="polite">{message}</p>
          </>
        )}
      </section>
    </GameLayout>
  );
}
