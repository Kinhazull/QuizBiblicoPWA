"use client";

import { useRef, useState } from "react";
import {
  createGameSessionId,
  GameLayout,
  recordPlatformGameCompletion,
  type GamePlayStatus,
} from "../sdk";
import {
  isCorrectThreeCluesAnswer,
  nextQuestionIndex,
  scoreForCluesUsed,
  THREE_CLUES_MAX,
} from "./engine";
import { THREE_CLUES_QUESTIONS } from "./questions";

export function ThreeCluesGame() {
  const sessionId = useRef(createGameSessionId());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Você pode responder agora ou revelar outra pista.");
  const question = THREE_CLUES_QUESTIONS[questionIndex];

  function revealNextClue() {
    if (status !== "playing" || revealedClues >= THREE_CLUES_MAX) return;
    const next = revealedClues + 1;
    setRevealedClues(next);
    setMessage(next === THREE_CLUES_MAX ? "Última pista revelada. Qual é a resposta?" : "Nova pista revelada.");
  }

  function submitAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "playing") return;
    if (!answer.trim()) {
      setMessage("Digite uma resposta antes de confirmar.");
      return;
    }

    if (isCorrectThreeCluesAnswer(answer, question.answer)) {
      const earned = scoreForCluesUsed(revealedClues);
      setScore(earned);
      setStatus("won");
      setMessage(`Resposta correta: ${question.answer}. Você fez ${earned} pontos.`);
    } else {
      setStatus("lost");
      setMessage(`A resposta era ${question.answer}.`);
    }
    void recordPlatformGameCompletion({
      gameId: "jogo-tres-pistas",
      sessionId: sessionId.current,
      questionId: question.id,
      answer,
      cluesUsed: revealedClues,
    }).catch(() => undefined);
  }

  function restart() {
    sessionId.current = createGameSessionId();
    setQuestionIndex(current => nextQuestionIndex(current, THREE_CLUES_QUESTIONS.length));
    setRevealedClues(1);
    setAnswer("");
    setStatus("playing");
    setScore(0);
    setMessage("Você pode responder agora ou revelar outra pista.");
  }

  return (
    <GameLayout
      eyebrow="Adivinhe com sabedoria"
      title="Jogo das"
      highlightedTitle="3 Pistas"
      description="Descubra a resposta bíblica usando o menor número de pistas."
      status={status}
      currentAttempt={revealedClues}
      maxAttempts={THREE_CLUES_MAX}
      onRestart={restart}
    >
      <section className="three-clues-game" aria-label="Jogo das 3 Pistas">
        <div className="three-clues-score" aria-live="polite">
          <span>Pontuação possível</span>
          <strong>{status === "won" ? score : scoreForCluesUsed(revealedClues)} pontos</strong>
        </div>

        <ol className="three-clues-list" aria-label="Pistas reveladas">
          {question.clues.map((clue, index) => {
            const visible = index < revealedClues;
            return (
              <li className={visible ? "visible" : "hidden"} key={clue}>
                <span>{index + 1}</span>
                <p>{visible ? clue : "Pista ainda não revelada"}</p>
              </li>
            );
          })}
        </ol>

        {status === "playing" && (
          <>
            <button className="three-clues-reveal" type="button" onClick={revealNextClue} disabled={revealedClues === THREE_CLUES_MAX}>
              {revealedClues === THREE_CLUES_MAX ? "Todas as pistas reveladas" : "Revelar próxima pista"}
            </button>
            <form className="three-clues-answer" onSubmit={submitAnswer}>
              <label htmlFor="three-clues-answer">Qual é a resposta?</label>
              <div>
                <input id="three-clues-answer" value={answer} onChange={event => setAnswer(event.target.value)} autoComplete="off" maxLength={60} placeholder="Digite sua resposta" />
                <button type="submit">Responder</button>
              </div>
            </form>
          </>
        )}

        <p className={`three-clues-message ${status}`} role="status" aria-live="polite">{message}</p>
      </section>
    </GameLayout>
  );
}
