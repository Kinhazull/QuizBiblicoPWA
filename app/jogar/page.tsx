"use client";

import { useEffect, useRef, useState } from "react";

type Choice = { id: string; text: string };
type Question = {
  id: string;
  reference?: string;
  prompt: string;
  choices: Choice[];
};
type Attempt = {
  id: string;
  attemptNumber: number;
  mode: string;
  secondsPerQuestion: number;
  questions: Question[];
  resumed?: boolean;
  nextIndex?: number;
  score?: number;
  remainingSeconds?: number;
};
type PendingAnswer = {
  choiceId: string;
  timedOut: boolean;
  responseTimeMs: number;
};

export default function PlayPage() {
  const requestedPractice =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("modo") === "treino";
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [round, setRound] = useState<any>(null);
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(20);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [networkError, setNetworkError] = useState(false);
  const [sending, setSending] = useState(false);
  const pending = useRef<PendingAnswer | null>(null);
  const started = useRef(Date.now());
  const answerRef = useRef<(choiceId: string) => void>(() => undefined);
  const sendPendingRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    fetch("/api/rounds/current")
      .then(async (response) => {
        if (response.status === 401) {
          location.href = "/";
          return;
        }
        const data = await response.json();
        setRound(data.round);
      })
      .catch(() =>
        setError("Sem conexão. Verifique sua internet e tente novamente."),
      );
  }, []);

  useEffect(() => {
    if (!attempt || selected) return;
    if (time <= 0) {
      answerRef.current("");
      return;
    }
    const timer = setTimeout(() => setTime((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [attempt, index, time, selected]);

  useEffect(() => {
    const retryWhenOnline = () => {
      if (pending.current && networkError) void sendPendingRef.current();
    };
    window.addEventListener("online", retryWhenOnline);
    return () => window.removeEventListener("online", retryWhenOnline);
  }, [networkError, attempt, index]);

  async function start(mode = "official") {
    if (!round) return;
    setError("");
    try {
      const response = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roundId: round.id, mode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error === "attempt_limit"
            ? "Suas três tentativas oficiais foram utilizadas."
            : data.error === "round_closing"
              ? "A rodada está perto do encerramento e não há mais tempo seguro para iniciar uma nova tentativa."
              : data.error === "attempt_expired"
                ? "O período de tolerância desta tentativa terminou."
                : "Não foi possível iniciar.",
        );
        return;
      }
      const current = data.attempt as Attempt;
      if ((current.nextIndex || 0) >= current.questions.length) {
        await finish(current.id);
        return;
      }
      setAttempt(current);
      setIndex(current.nextIndex || 0);
      setScore(current.score || 0);
      setTime(current.remainingSeconds ?? current.secondsPerQuestion);
      started.current =
        Date.now() -
        (current.secondsPerQuestion -
          (current.remainingSeconds ?? current.secondsPerQuestion)) *
          1000;
    } catch {
      setError("Sem conexão. Verifique sua internet e tente novamente.");
    }
  }

  async function finish(id: string) {
    try {
      const response = await fetch(`/api/attempts/${id}/finish`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) setResult(data.result);
      else setError("Não foi possível concluir a tentativa.");
    } catch {
      setError(
        "A conclusão ainda não foi confirmada. Reconecte-se e tente novamente.",
      );
    }
  }

  function answer(choiceId: string) {
    if (!attempt || selected) return;
    const elapsed = Math.min(
      Date.now() - started.current,
      attempt.secondsPerQuestion * 1000,
    );
    pending.current = {
      choiceId,
      timedOut: !choiceId,
      responseTimeMs: choiceId ? elapsed : attempt.secondsPerQuestion * 1000,
    };
    setSelected(choiceId || "timeout");
    sendPending();
  }

  async function sendPending() {
    if (!attempt || !pending.current || sending) return;
    setSending(true);
    setNetworkError(false);
    const question = attempt.questions[index];
    const current = pending.current;
    try {
      const response = await fetch(`/api/attempts/${attempt.id}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          choiceId: current.choiceId || question.choices[0].id,
          timedOut: current.timedOut,
          questionOrder: index,
          choiceOrder: question.choices.map((choice) => choice.id),
          responseTimeMs: current.responseTimeMs,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "answer_failed");
      setFeedback({ ...data, chosen: current.choiceId });
      setScore(Number(data.totalScore || 0));
      pending.current = null;
    } catch {
      setNetworkError(true);
    } finally {
      setSending(false);
    }
  }

  async function next() {
    if (!attempt || pending.current) return;
    if (index < attempt.questions.length - 1) {
      const response = await fetch(`/api/attempts/${attempt.id}/advance`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError("Não foi possível abrir a próxima pergunta. Tente novamente.");
        return;
      }
      setIndex((value) => value + 1);
      setSelected(null);
      setFeedback(null);
      setNetworkError(false);
      setTime(data.remainingSeconds ?? attempt.secondsPerQuestion);
      started.current = Number(data.startedAt || Date.now());
      return;
    }
    await finish(attempt.id);
  }

  answerRef.current = answer;
  sendPendingRef.current = sendPending;

  if (result)
    return (
      <main className="shell result-screen">
        <header className="brand">
          <span className="brand-dot">✦</span> CONTE OS FEITOS
        </header>
        <section className="result-card">
          <div className="trophy">🏆</div>
          <p className="eyebrow">TENTATIVA CONCLUÍDA</p>
          <h1>
            Você fez <em>{result.score.toLocaleString("pt-BR")}</em>
          </h1>
          <div className="score-block">
            <small>ACERTOS</small>
            <strong>{result.correctAnswers}/10</strong>
            <span>maior sequência: {result.maxStreak}</span>
          </div>
          <button
            className="primary"
            onClick={() => (location.href = "/rankings")}
          >
            VER RANKINGS <span>→</span>
          </button>
          <button className="auth-switch" onClick={() => (location.href = "/")}>
            Voltar ao início
          </button>
        </section>
      </main>
    );

  if (!attempt)
    return (
      <main className="shell start-screen">
        <header className="brand">
          <span className="brand-dot">✦</span> CONTE OS FEITOS
        </header>
        <section className="hero-card">
          <div className="orbit">
            <span>📖</span>
            <i />
            <b />
          </div>
          {round ? (
            <>
              <p className="eyebrow">
                {requestedPractice ? "JORNADA DE TREINO" : "JORNADA DA SEMANA"}
              </p>
              <h1>{round.title}</h1>
              <p className="intro">
                {round.theme}
                <br />
                {requestedPractice
                  ? "O treino não consome tentativas nem altera o Ranking oficial."
                  : round.resuming
                    ? "Você possui uma tentativa em andamento dentro do período de tolerância."
                    : `${Math.max(0, round.attemptLimit - round.attemptsUsed)} tentativa(s) oficial(is) disponível(is). Partidas interrompidas são retomadas automaticamente.`}
              </p>
              <button
                className="primary"
                onClick={() =>
                  start(requestedPractice ? "practice" : "official")
                }
                disabled={
                  requestedPractice
                    ? !round.practiceAllowed
                    : !round.resuming &&
                      (round.attemptsUsed >= round.attemptLimit ||
                        !round.canStart)
                }
              >
                {requestedPractice
                  ? "INICIAR OU CONTINUAR TREINO"
                  : round.resuming
                    ? "CONTINUAR JORNADA"
                    : round.canStart
                      ? "INICIAR JORNADA"
                      : "NOVAS TENTATIVAS ENCERRADAS"}{" "}
                <span>→</span>
              </button>
              {!requestedPractice && !round.resuming && !round.canStart && (
                <p className="auth-message">
                  A jornada continua aberta apenas para quem já iniciou uma
                  tentativa.
                </p>
              )}
              {!requestedPractice &&
                round.practiceAllowed &&
                round.attemptsUsed >= round.attemptLimit &&
                round.canStart && (
                  <button
                    className="auth-switch"
                    onClick={() => (location.href = "/jogar?modo=treino")}
                  >
                    Iniciar Jornada de Treino
                  </button>
                )}
            </>
          ) : (
            <>
              <p className="eyebrow">AGUARDE</p>
              <h1>
                Nenhuma jornada <em>ativa</em>
              </h1>
              <p className="intro">
                A próxima jornada aparecerá aqui no horário programado.
              </p>
            </>
          )}
          {error && <p className="auth-message">{error}</p>}
        </section>
      </main>
    );

  const question = attempt.questions[index];
  return (
    <main className="shell game-screen">
      <header className="game-header">
        <div className="brand">
          <span className="brand-dot">✦</span> CONTE OS FEITOS
        </div>
        <div className="live-score" aria-live="polite">
          <small>PONTOS</small>
          <b>{score.toLocaleString("pt-BR")}</b>
        </div>
      </header>
      <div
        className="progress"
        role="progressbar"
        aria-label="Progresso da tentativa"
        aria-valuemin={0}
        aria-valuemax={attempt.questions.length}
        aria-valuenow={index + (selected ? 1 : 0)}
      >
        <i
          style={{
            width: `${((index + (selected ? 1 : 0)) / attempt.questions.length) * 100}%`,
          }}
        />
      </div>
      <section className="game-card">
        <div className="question-meta">
          <span className="category">
            📖 {question.reference || "QUIZ BÍBLICO"}
          </span>
          <span>
            PERGUNTA {index + 1}
            <b> / {attempt.questions.length}</b>
          </span>
        </div>
        <div
          className={`timer ${time <= 5 ? "urgent" : ""}`}
          aria-label={`${time} segundos restantes`}
          style={{ "--time": `${time * 18}deg` } as React.CSSProperties}
        >
          <span aria-hidden="true">{time}</span>
        </div>
        <h2>{question.prompt}</h2>
        <div className="answers">
          {question.choices.map((choice, choiceIndex) => (
            <button
              key={choice.id}
              className={
                feedback?.chosen === choice.id
                  ? feedback.correct
                    ? "correct"
                    : "wrong"
                  : ""
              }
              onClick={() => answer(choice.id)}
              disabled={!!selected}
            >
              <b>{String.fromCharCode(65 + choiceIndex)}</b>
              <span>{choice.text}</span>
              <i aria-hidden="true">
                {feedback?.chosen === choice.id
                  ? feedback.correct
                    ? "✓"
                    : "×"
                  : ""}
              </i>
            </button>
          ))}
        </div>
        <div aria-live="assertive">
          {sending && (
            <div className="connection-state">
              <strong>Confirmando resposta...</strong>
              <p>Não feche o aplicativo.</p>
            </div>
          )}
          {networkError && (
            <div className="connection-state offline">
              <strong>Resposta ainda não enviada</strong>
              <p>
                Verifique sua internet. A questão não avançará até a
                confirmação.
              </p>
              <button onClick={sendPending}>REENVIAR RESPOSTA</button>
            </div>
          )}
          {feedback && (
            <div className={`feedback ${feedback.correct ? "good" : "bad"}`}>
              <div>
                <strong>
                  {feedback.correct
                    ? `Muito bem! +${feedback.points}`
                    : "Continue firme!"}
                </strong>
                <p>{feedback.commentary}</p>
              </div>
              <button onClick={next}>
                {index === attempt.questions.length - 1
                  ? "FINALIZAR"
                  : "PRÓXIMA"}{" "}
                →
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
