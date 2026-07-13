"use client";

import { useEffect, useState } from "react";

const utcDate = (value: number) => new Date(value).toISOString().slice(0, 16);

export default function Details() {
  const [data, setData] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const id = typeof window === "undefined" ? "" : new URL(location.href).searchParams.get("id") || "";

  async function load() {
    if (!id) return;
    const response = await fetch(`/api/admin/rounds/${id}`);
    if (response.status === 401 || response.status === 403) {
      location.href = "/";
      return;
    }
    setData(await response.json());
  }

  useEffect(() => {
    load();
  }, [id]);

  async function action(status: string, releaseNow = false) {
    if (status === "closed" && !confirm("Encerrar esta rodada agora?")) return;
    const response = await fetch(`/api/admin/rounds/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, releaseNow }),
    });
    setMessage(response.ok ? "Rodada atualizada." : "Não foi possível atualizar.");
    if (response.ok) load();
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/admin/rounds/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, status: data.round.status }),
    });
    const result = await response.json();
    if (response.ok) {
      setEditing(false);
      setMessage("Agendamento atualizado.");
      load();
    } else {
      setMessage(result.error === "round_locked" ? "Esta rodada já começou ou possui tentativas e não pode mais ser editada." : "Confira as datas e os campos.");
    }
  }

  async function duplicate() {
    if (!confirm("Criar uma cópia completa desta rodada?")) return;
    const response = await fetch(`/api/admin/rounds/${id}/duplicate`, { method: "POST" });
    const result = await response.json();
    if (response.ok) location.href = `/admin/rodadas/detalhes?id=${result.roundId}`;
    else setMessage("Não foi possível duplicar.");
  }

  async function remove() {
    const response = await fetch(`/api/admin/rounds/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await response.json();
    if (response.ok) location.href = "/admin/rodadas/lista";
    else setMessage(result.error === "invalid_password" ? "Senha incorreta." : "Não foi possível remover.");
  }

  if (!data) return <main className="admin-shell"><p>Carregando...</p></main>;

  const editable = Number(data.attempts?.total || 0) === 0 && ["draft", "scheduled"].includes(data.round.status);
  const canRelease = data.round.status === "scheduled" && Number(data.round.opens_at) > Date.now();

  return <main className="admin-shell">
    <section className="admin-title">
      <p className="eyebrow">DETALHES DA RODADA</p>
      <h1>{data.round.title}</h1>
      <p>{data.attempts?.participants || 0} participante(s) · {data.attempts?.total || 0} tentativa(s) · Horários exibidos em Brasília</p>
    </section>
    <section className="admin-panel round-detail-actions">
      {editable && <button onClick={() => setEditing(true)}>Editar agendamento</button>}
      <button onClick={duplicate}>Duplicar</button>
      {canRelease && <button className="release" onClick={() => action("active", true)}>Liberar agora</button>}
      {!['closed', 'cancelled'].includes(data.round.status) && <button onClick={() => action("closed")}>Encerrar</button>}
      <button className="danger" onClick={() => setConfirming(true)}>{Number(data.attempts?.total) > 0 ? "Cancelar e arquivar" : "Excluir"}</button>
    </section>
    {message && <p className="auth-message">{message}</p>}
    {editing && <form className="admin-panel round-edit-form" onSubmit={save}>
      <h2>Editar rodada futura</h2>
      <label>Título<input name="title" defaultValue={data.round.title} required /></label>
      <label>Tema<input name="theme" defaultValue={data.round.theme} required /></label>
      <label>Descrição<textarea name="description" defaultValue={data.round.description || ""} /></label>
      <div>
        <label>Abertura (UTC)<input name="opensAt" type="datetime-local" defaultValue={utcDate(data.round.opens_at)} required /></label>
        <label>Encerramento (UTC)<input name="closesAt" type="datetime-local" defaultValue={utcDate(data.round.closes_at)} required /></label>
        <label>Segundos por pergunta<input name="secondsPerQuestion" type="number" min="15" max="60" defaultValue={data.round.seconds_per_question} /></label>
      </div>
      <p>Preencha em UTC. Após salvar, os horários serão exibidos convertidos para o horário de Brasília.</p>
      <footer><button type="button" onClick={() => setEditing(false)}>Cancelar</button><button className="release">Salvar alterações</button></footer>
    </form>}
    <section className="question-detail-list">
      {data.questions.map((question: any) => <article className="admin-panel" key={question.id}>
        <small>PERGUNTA {question.position} · {question.reference}</small>
        <h2>{question.prompt}</h2>
        {question.choices.map((choice: any) => <p className={choice.correct ? "correct-preview" : ""} key={choice.id}>{choice.text}</p>)}
        <em>{question.commentary}</em>
      </article>)}
    </section>
    {confirming && <div className="modal-layer"><section className="admin-panel removal-modal">
      <h2>{Number(data.attempts?.total) > 0 ? "Cancelar e arquivar rodada?" : "Excluir rodada?"}</h2>
      <p>{Number(data.attempts?.total) > 0 ? "Os resultados serão preservados, mas a rodada não aceitará novas tentativas." : "A rodada e suas perguntas serão removidas."}</p>
      <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Senha administrativa" />
      <div><button onClick={() => setConfirming(false)}>Voltar</button><button className="danger" onClick={remove}>Confirmar</button></div>
    </section></div>}
  </main>;
}
