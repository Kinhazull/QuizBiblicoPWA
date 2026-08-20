"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createGameSessionId, GameInstruction, GameLayout, recordPlatformGameCompletion, type GamePlayStatus } from "../sdk";
import { gameContentRequestFromLocation, loadGameContent, validateGameContentAction } from "../loader";
import type { LoadedGameContent } from "../loader";
import { GameType } from "../../../shared/content";
import { presentContentTitle } from "../contentPresentation";
import type { WhoAmIAction, WhoAmIChallengeHistory } from "./engine";

type PublishedChallenge = { id: string; hints: string[] };
type PublishedWhoAmI = {
  id: string;
  version: number;
  title: string;
  challenges: PublishedChallenge[];
  biblicalReference: string | null;
};

export function WhoAmIGame() {
  const sessionId = useRef(createGameSessionId());
  const completionRecorded = useRef(false);
  const [content, setContent] = useState<PublishedWhoAmI | null>(null);
  const [loadedContent, setLoadedContent] = useState<LoadedGameContent<PublishedWhoAmI> | null>(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [hintsVisible, setHintsVisible] = useState(1);
  const [actions, setActions] = useState<WhoAmIAction[]>([]);
  const [histories, setHistories] = useState<WhoAmIChallengeHistory[]>([]);
  const [answer, setAnswer] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState("Leia a primeira pista e responda quando estiver pronto.");
  const [feedbackTone, setFeedbackTone] = useState<"correct" | "incorrect" | "">("");

  const loadContent = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const loaded = await loadGameContent<PublishedWhoAmI>({
        ...gameContentRequestFromLocation(GameType.WHO_AM_I),
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

  function revealHint() {
    if (!challenge || status !== "playing" || hintsVisible >= challenge.hints.length || validating) return;
    setHintsVisible(value => value + 1);
    setActions(current => [...current, { type: "reveal" }]);
    setMessage(`Pista ${hintsVisible + 1} de ${challenge.hints.length} revelada.`);
    setFeedbackTone("");
  }

  async function registerCompletion(nextHistories: WhoAmIChallengeHistory[], wonCount: number) {
    if (!content || completionRecorded.current) return;
    completionRecorded.current = true;
    const nextStatus: GamePlayStatus = wonCount > 0 ? "won" : "lost";
    setStatus(nextStatus);
    setMessage(`Conjunto concluído: ${wonCount} de ${content.challenges.length} resposta(s) correta(s).`);
    try {
      await recordPlatformGameCompletion({
        gameId: "quem-sou-eu",
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

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (!content || !loadedContent || !challenge || !answer.trim() || validating || status !== "playing") return;
    setValidating(true);
    try {
      const result = await validateGameContentAction<{ correct: boolean }>(
        loadedContent,
        "validate_answer",
        { challengeId: challenge.id, answer },
      );
      const challengeActions: WhoAmIAction[] = [...actions, { type: "guess", answer }];
      const nextHistories = [...histories, { challengeId: challenge.id, actions: challengeActions }];
      const nextCorrectCount = correctCount + (result.correct ? 1 : 0);
      setFeedbackTone(result.correct ? "correct" : "incorrect");
      setHistories(nextHistories);
      setCorrectCount(nextCorrectCount);
      setAnswer("");
      if (challengeIndex === content.challenges.length - 1) {
        await registerCompletion(nextHistories, nextCorrectCount);
      } else {
        const nextIndex = challengeIndex + 1;
        setChallengeIndex(nextIndex);
        setHintsVisible(1);
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
    setHintsVisible(1);
    setActions([]);
    setHistories([]);
    setAnswer("");
    setCorrectCount(0);
    setStatus("playing");
    setValidating(false);
    setMessage("Leia a primeira pista e responda quando estiver pronto.");
    setFeedbackTone("");
    void loadContent();
  }

  const challengeCount = content?.challenges.length ?? 0;
  return (
    <GameLayout eyebrow="Descubra o personagem" title="Quem Sou" highlightedTitle="Eu?"
      description="Use as pistas para identificar personagens bíblicos."
      status={status} currentAttempt={Math.min(challengeIndex + 1, challengeCount || 1)}
      maxAttempts={challengeCount || 1} progressLabel="Desafios"
      gameType={GameType.WHO_AM_I} mode={loadedContent?.mode} onRestart={restart}>
      <section className="who-am-i-game" aria-label="Quem Sou Eu?" aria-busy={loading || validating}>
        {loading && <p className="who-am-i-message" role="status">Preparando as fichas dos personagens…</p>}
        {loadError && <p className="who-am-i-message" role="alert">Estamos preparando novos personagens. Tente novamente em instantes.</p>}
        {content && challenge && !loading && !loadError && (
          <>
            <header className="who-am-i-heading">
              <div className="who-am-i-portrait" aria-hidden="true"><span>?</span></div>
              <div><span>{presentContentTitle(content.title, "Rodada de identidades")}</span>
                <h2>Identidade {challengeIndex + 1} de {challengeCount}</h2>
                <p className="who-am-i-score">Pontuação máxima desta identidade: <strong>{Math.max(100, (challenge.hints.length - hintsVisible + 1) * 100)}</strong></p></div>
            </header>
            <ol className="who-am-i-hints" aria-label="Pistas reveladas">
              {challenge.hints.slice(0, hintsVisible).map((hint, index) => (
                <li key={`${challenge.id}:${index}`} className={index === hintsVisible - 1 ? "is-current" : ""}>
                  <span>{index + 1}</span><p>{hint}</p>
                </li>
              ))}
            </ol>
            {status === "playing" && hintsVisible < challenge.hints.length && (
              <button className="who-am-i-reveal" type="button" onClick={revealHint} disabled={validating}>
                Revelar pista {hintsVisible + 1} — reduz a pontuação máxima
              </button>
            )}
            {status === "playing" && (
              <form className="who-am-i-options" onSubmit={submitAnswer}>
                <label htmlFor="who-am-i-answer">Sua resposta</label>
                <input id="who-am-i-answer" value={answer} maxLength={100} autoComplete="off"
                  disabled={validating} onChange={event => setAnswer(event.target.value)}
                  placeholder="Digite o nome do personagem" />
                <button type="submit" disabled={validating || !answer.trim()}>
                  {validating ? "Validando..." : "Responder"}
                </button>
              </form>
            )}
            <GameInstruction>Identifique o personagem com o menor número de pistas. Você pode responder a qualquer momento.</GameInstruction>
            <p className={`who-am-i-message ${status} ${feedbackTone}`} role="status" aria-live="polite">{message}</p>
          </>
        )}
      </section>
    </GameLayout>
  );
}
