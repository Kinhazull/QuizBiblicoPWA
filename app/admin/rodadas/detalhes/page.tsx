"use client";

import { useEffect, useState } from "react";
import { roundErrorMessage } from "../../../round-errors";

const brasiliaDate = (value: number) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(item => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};

export default function Details() {
  const [data, setData] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [seasons, setSeasons] = useState<any[]>([]);
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
    fetch("/api/admin/seasons").then(async response => { if(response.ok)setSeasons((await response.json()).seasons||[]); });
  }, [id]);

  async function action(status: string, releaseNow = false) {
    if (status === "closed" && !confirm("Encerrar esta rodada agora?")) return;
    const response = await fetch(`/api/admin/rounds/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, releaseNow }),
    });
    const result=await response.json();setMessage(response.ok ? "Rodada atualizada." : roundErrorMessage(result));
    if (response.ok) load();
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/admin/rounds/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, featured: form.featured === "on", advancedRules: form.useAdvanced === "on" ? { allowPractice: form.allowPractice === "on", basePoints: form.basePoints, speedPointsPerSecond: form.speedPointsPerSecond, streakBonus: form.streakBonus, minimumCorrectPoints: form.minimumCorrectPoints } : null, status: data.round.status }),
    });
    const result = await response.json();
    if (response.ok) {
      setEditing(false);
      setMessage("Agendamento atualizado.");
      load();
    } else {
      setMessage(roundErrorMessage(result));
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
  const rules = data.round.advanced_rules_json ? JSON.parse(data.round.advanced_rules_json) : null;

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
        <label>Abertura (horário de Brasília)<input name="opensAt" type="datetime-local" defaultValue={brasiliaDate(data.round.opens_at)} required /></label>
        <label>Encerramento (horário de Brasília)<input name="closesAt" type="datetime-local" defaultValue={brasiliaDate(data.round.closes_at)} required /></label>
        <label>Segundos por pergunta<input name="secondsPerQuestion" type="number" min="15" max="60" defaultValue={data.round.seconds_per_question} /></label>
        <label>Tentativas oficiais<input name="officialAttemptLimit" type="number" min="1" max="5" defaultValue={data.round.official_attempt_limit} /></label>
        <label>Temporada<select name="seasonId" defaultValue={data.round.season_id||""}><option value="">Sem temporada</option>{seasons.filter(item=>item.status!=="cancelled").map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        <label>Tipo<select name="roundType" defaultValue={data.round.round_type||"regular"}><option value="regular">Regular</option><option value="special">Evento especial</option></select></label>
        <label className="round-checkbox"><input name="featured" type="checkbox" defaultChecked={Boolean(data.round.featured)} /> Destacar evento</label>
        <label className="round-checkbox"><input name="useAdvanced" type="checkbox" defaultChecked={Boolean(rules)} /> Usar regras avançadas</label>
        <label>Pontos base<input name="basePoints" type="number" min="100" max="1000" defaultValue={rules?.basePoints??400} /></label>
        <label>Pontos por segundo<input name="speedPointsPerSecond" type="number" min="0" max="100" defaultValue={rules?.speedPointsPerSecond??40} /></label>
        <label>Bônus de sequência<input name="streakBonus" type="number" min="0" max="300" defaultValue={rules?.streakBonus??100} /></label>
        <label>Pontuação mínima<input name="minimumCorrectPoints" type="number" min="0" max="500" defaultValue={rules?.minimumCorrectPoints??100} /></label>
        <label className="round-checkbox"><input name="allowPractice" type="checkbox" defaultChecked={rules?.allowPractice===true} /> Permitir prática</label>
      </div>
      <p>Informe a data e o horário de Brasília. Exemplo: 19/07/2026 09:30.</p>
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
