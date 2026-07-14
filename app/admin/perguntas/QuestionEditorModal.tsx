"use client";

import { useEffect, useState } from "react";

export default function QuestionEditorModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [question, setQuestion] = useState<any>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  useEffect(() => { fetch(`/api/admin/questions/${id}`).then(async response => { if (!response.ok) { setMessage("Não foi possível abrir a pergunta."); return; } const data = await response.json(); setQuestion({ ...data.question, choices: data.choices.map((choice: any) => choice.text), correctIndex: Math.max(0, data.choices.findIndex((choice: any) => choice.correct)) }); }); }, [id]);
  const patch = (value: any) => setQuestion((current: any) => ({ ...current, ...value }));

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/questions/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(question) }), data = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(data.error === "duplicate_question" ? `Já existe uma pergunta igual: “${data.duplicate?.prompt}”.` : "Confira os campos e tente novamente."); return; }
    onChanged(); onClose();
  }

  async function archive() {
    if (!confirm("Excluir esta pergunta do acervo? Ela será arquivada e deixará de aparecer em novas rodadas.")) return;
    setBusy(true); const response = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" }); setBusy(false);
    if (!response.ok) { setMessage("Não foi possível arquivar a pergunta."); return; }
    onChanged(); onClose();
  }

  return <div className="bank-editor-layer"><form className="bank-editor" onSubmit={save}><h2>Editar pergunta</h2>{!question ? <p>{message || "Carregando..."}</p> : <><div className="bank-editor-grid"><label>Referência<input value={question.reference || ""} onChange={event => patch({ reference: event.target.value })}/></label><label>Livro<input value={question.book || ""} onChange={event => patch({ book: event.target.value })}/></label><label>Tema<input required value={question.theme || ""} onChange={event => patch({ theme: event.target.value })}/></label><label>Categoria<input value={question.category || ""} onChange={event => patch({ category: event.target.value })}/></label><label>Dificuldade<select value={question.difficulty} onChange={event => patch({ difficulty: event.target.value })}><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option></select></label><label>Situação<select value={question.status} onChange={event => patch({ status: event.target.value })}><option value="active">Ativa</option><option value="draft">Rascunho</option></select></label><label className="wide">Enunciado<textarea required value={question.prompt} onChange={event => patch({ prompt: event.target.value })}/></label></div><div className="bank-choices">{question.choices.map((choice: string, index: number) => <label className="bank-choice" key={index}><input type="radio" checked={question.correctIndex === index} onChange={() => patch({ correctIndex: index })}/><input required value={choice} onChange={event => { const choices = [...question.choices]; choices[index] = event.target.value; patch({ choices }); }}/></label>)}</div><label>Comentário<textarea value={question.commentary || ""} onChange={event => patch({ commentary: event.target.value })}/></label>{message && <p className="auth-message">{message}</p>}<footer><button type="button" className="danger" disabled={busy} onClick={archive}>EXCLUIR DO ACERVO</button><button type="button" onClick={onClose}>Cancelar</button><button className="save" disabled={busy}>{busy ? "SALVANDO..." : "SALVAR"}</button></footer></>}</form></div>;
}
