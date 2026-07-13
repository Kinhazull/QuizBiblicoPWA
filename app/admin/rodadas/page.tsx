"use client";

import { useState } from "react";

const blankQuestion = () => ({ reference: "", prompt: "", choices: ["", "", "", ""], correctIndex: 0, commentary: "" });

export default function RoundsAdmin() {
  const [questions, setQuestions] = useState(() => Array.from({ length: 10 }, blankQuestion));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function updateQuestion(index: number, patch: any) {
    setQuestions(current => current.map((question, position) => position === index ? { ...question, ...patch } : question));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: data.title, theme: data.theme, description: data.description, opensAt: data.opensAt, closesAt: data.closesAt, questions }),
    });
    const result = await response.json();
    if (response.ok) {
      location.replace(`/admin/rodadas/detalhes?id=${result.roundId}`);
      return;
    }
    setMessage("Confira os dados e as dez perguntas.");
    setBusy(false);
  }

  return <main className="admin-shell">
    <header className="admin-head"><div className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</div><a href="/admin">Acessos</a></header>
    <section className="admin-title"><p className="eyebrow">NOVA RODADA</p><h1>Prepare a próxima <em>jornada</em></h1><p>Ela permanecerá bloqueada até a data e o horário definidos.</p></section>
    <form className="round-form" onSubmit={submit}>
      <section className="admin-panel round-basics">
        <label>Título<input name="title" required placeholder="Ex.: Contem o que Deus fez" /></label>
        <label>Tema<input name="theme" required placeholder="Testemunhos e milagres" /></label>
        <label className="wide">Apresentação<textarea name="description" placeholder="Uma breve introdução para os participantes" /></label>
        <label>Liberação (horário de Brasília)<input name="opensAt" type="datetime-local" required /></label>
        <label>Encerramento (horário de Brasília)<input name="closesAt" type="datetime-local" required /></label>
        <p className="utc-note">Informe no horário de Brasília. Exemplo: 19/07/2026 09:30.</p>
      </section>
      <div className="question-builder">{questions.map((question, index) => <section className="admin-panel edit-question" key={index}>
        <div className="panel-title"><div><small>PERGUNTA {index + 1}</small><h2>{question.prompt || "Nova pergunta"}</h2></div></div>
        <label>Referência<input value={question.reference} onChange={event => updateQuestion(index, { reference: event.target.value })} placeholder="Ex.: João 9" /></label>
        <label>Enunciado<textarea required value={question.prompt} onChange={event => updateQuestion(index, { prompt: event.target.value })} /></label>
        <div className="choice-editor">{question.choices.map((choice, choiceIndex) => <label key={choiceIndex} className={question.correctIndex === choiceIndex ? "chosen" : ""}>
          <input type="radio" name={`correct-${index}`} checked={question.correctIndex === choiceIndex} onChange={() => updateQuestion(index, { correctIndex: choiceIndex })} />
          <span>{String.fromCharCode(65 + choiceIndex)}</span>
          <input required value={choice} onChange={event => { const choices = [...question.choices]; choices[choiceIndex] = event.target.value; updateQuestion(index, { choices }); }} placeholder={`Alternativa ${String.fromCharCode(65 + choiceIndex)}`} />
        </label>)}</div>
        <label>Comentário após a resposta<textarea value={question.commentary} onChange={event => updateQuestion(index, { commentary: event.target.value })} /></label>
      </section>)}</div>
      <div className="publish-bar"><span>{message || "10 perguntas · 3 tentativas oficiais · 20 segundos"}</span><button className="primary" disabled={busy}>{busy ? "AGENDANDO..." : "AGENDAR RODADA"}</button></div>
    </form>
  </main>;
}
