"use client";
import { useEffect, useState } from "react";

export default function Journey() {
  const [data, setData] = useState<any>(null), [review, setReview] = useState<any>(null), [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/journey").then(response => { if (response.status === 401) { location.href = "/"; return null; } return response.json(); }).then(setData); }, []);
  async function open(id: string) { setMessage(""); const response = await fetch(`/api/journey/${id}`), result = await response.json(); if (response.ok) setReview(result); else setMessage(result.error === "not_attempted" ? "Você não realizou esta Jornada." : "A revisão ainda não está disponível."); }
  if (!data) return <main className="admin-shell"><p>Carregando sua Jornada...</p></main>;
  return <main className="admin-shell journey-page">
    <section className="admin-title"><p className="eyebrow">MINHA JORNADA</p><h1>Seu caminho na <em>Palavra</em></h1><p>Acompanhe sua evolução e reveja o que aprendeu nas Jornadas encerradas.</p></section>
    <section className="journey-summary"><article><small>JORNADAS</small><strong>{data.summary.completed}</strong></article><article><small>PONTOS</small><strong>{Number(data.summary.totalScore).toLocaleString("pt-BR")}</strong></article><article><small>MÉDIA</small><strong>{Number(data.summary.average).toLocaleString("pt-BR")}</strong></article><article><small>MELHOR</small><strong>{Number(data.summary.best).toLocaleString("pt-BR")}</strong></article></section>
    {message && <p className="auth-message">{message}</p>}
    <section className="journey-list">{data.rounds.map((journey: any) => <article className="admin-panel" key={journey.id}><div><small>{new Date(journey.opensAt).toLocaleDateString("pt-BR")} · {journey.theme}</small><h2>{journey.title}</h2><p>{journey.attempts ? `${journey.bestCorrect}/10 acertos · melhor resultado ${Number(journey.bestScore).toLocaleString("pt-BR")} pts` : "Jornada não realizada"}</p></div><button onClick={() => open(journey.id)} disabled={!journey.attempts}>{journey.attempts ? "REVISAR" : "NÃO REALIZADA"}</button></article>)}{!data.rounds.length && <p>Nenhuma Jornada encerrada ainda.</p>}</section>
    {review && <div className="review-layer"><section className="review-sheet"><header><div><small>REVISÃO</small><h2>{review.round.title}</h2><p>{review.attempt.correctAnswers}/10 acertos · {Number(review.attempt.score).toLocaleString("pt-BR")} pontos</p></div><button onClick={() => setReview(null)}>FECHAR</button></header>{review.questions.map((question: any) => <article key={question.id}><small>PERGUNTA {question.position} · {question.reference}</small><h3>{question.prompt}</h3>{question.choices.map((choice: any) => <p key={choice.id} className={`${choice.correct ? "answer-correct" : ""} ${question.selectedChoiceId === choice.id && !choice.correct ? "answer-wrong" : ""}`}>{choice.correct ? "✓ " : question.selectedChoiceId === choice.id ? "× " : ""}{choice.text}{question.selectedChoiceId === choice.id ? " · sua resposta" : ""}</p>)}{question.commentary && <em>{question.commentary}</em>}</article>)}</section></div>}
  </main>;
}
