"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type AdminEvent = {
  id: string;
  title: string;
  status: string;
  startsAt: number;
  endsAt: number;
  games: unknown[];
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const load = () => fetch("/api/admin/events", { cache: "no-store" })
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(data => setEvents(data.events || []))
    .catch(() => setMessage("Não foi possível carregar os eventos."));

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    let games: unknown;
    try {
      games = JSON.parse(String(values.games));
    } catch {
      setMessage("Confira o JSON de jogos e conteúdos.");
      return;
    }
    const response = await fetch(editingId ? `/api/admin/events/${encodeURIComponent(editingId)}` : "/api/admin/events", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...values,
        startsAt: new Date(String(values.startsAt)).getTime(),
        endsAt: new Date(String(values.endsAt)).getTime(),
        minimumParticipations: Number(values.minimumParticipations || 1),
        participationXp: Number(values.participationXp || 0),
        victoryCoins: Number(values.victoryCoins || 0),
        completionBonusXp: Number(values.completionBonusXp || 0),
        perfectBonusCoins: Number(values.perfectBonusCoins || 0),
        games,
      }),
    });
    const data = await response.json();
    setMessage(response.ok
      ? (editingId ? "Rascunho atualizado." : "Evento salvo como rascunho.")
      : `Não foi possível salvar: ${data.error || "erro"}.`);
    if (response.ok) {
      form.reset();
      setEditingId("");
      void load();
    }
  }

  async function action(id: string, name: "validate" | "schedule" | "cancel") {
    const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}/${name}`, { method: "POST" });
    const data = await response.json();
    setMessage(response.ok
      ? (name === "validate" ? "Evento válido." : name === "schedule" ? "Evento agendado." : "Evento cancelado.")
      : `Operação recusada: ${data.error || "erro"}.`);
    void load();
  }

  async function edit(id: string) {
    const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.event || !formRef.current) {
      setMessage("Não foi possível abrir o rascunho.");
      return;
    }
    const item = data.event;
    const form = formRef.current.elements;
    const set = (name: string, value: string) => {
      const control = form.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (control) control.value = value;
    };
    set("title", item.title);
    set("description", item.description);
    set("coverUrl", item.coverUrl || "");
    set("startsAt", new Date(item.startsAt).toISOString().slice(0, 16));
    set("endsAt", new Date(item.endsAt).toISOString().slice(0, 16));
    set("timeZone", item.timeZone);
    set("completionRule", item.completionRule);
    set("minimumParticipations", String(item.minimumParticipations));
    set("participationXp", String(item.rewards.participationXp));
    set("victoryCoins", String(item.rewards.victoryCoins));
    set("completionBonusXp", String(item.rewards.completionBonusXp));
    set("perfectBonusCoins", String(item.rewards.perfectBonusCoins));
    set("games", JSON.stringify(item.games.map((game: any) => ({
      gameType: game.gameType,
      contentItems: game.contents.map((content: any) => ({
        contentId: content.contentId,
        contentVersion: content.contentVersion,
      })),
    })), null, 2));
    setEditingId(id);
    formRef.current.scrollIntoView({ behavior: "smooth" });
  }

  async function suggest() {
    if (!formRef.current) return;
    const form = formRef.current.elements;
    const gameType = (form.namedItem("suggestGame") as HTMLSelectElement).value;
    const count = gameType === "quiz-biblico" ? 5 : 1;
    const response = await fetch("/api/admin/events/suggest-content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameType, count }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage("Não foi possível sugerir conteúdo.");
      return;
    }
    const target = form.namedItem("games") as HTMLTextAreaElement;
    target.value = JSON.stringify([{ gameType, contentItems: data.suggestions.map((item: any) => ({
      contentId: item.contentId,
      contentVersion: item.contentVersion,
    })) }], null, 2);
    setMessage("Sugestão preenchida. Revise antes de salvar.");
  }

  return <main className="admin-shell">
    <section className="admin-title">
      <p className="eyebrow">PLATAFORMA</p>
      <h1>Gestão de <em>eventos</em></h1>
      <p>Monte, valide e agende eventos sem alterar os jogos ou o catálogo publicado.</p>
    </section>
    <section className="admin-grid">
      <form ref={formRef} className="admin-panel round-form" onSubmit={create}>
        <h2>{editingId ? "Editar rascunho" : "Novo evento"}</h2>
        <label>Título<input name="title" required minLength={3} /></label>
        <label>Descrição<textarea name="description" required /></label>
        <label>URL da capa (opcional)<input name="coverUrl" type="url" /></label>
        <div className="profile-fields">
          <label>Início<input name="startsAt" type="datetime-local" required /></label>
          <label>Fim<input name="endsAt" type="datetime-local" required /></label>
          <label>Fuso<input name="timeZone" defaultValue="America/Sao_Paulo" required /></label>
          <label>Regra de conclusão<select name="completionRule" defaultValue="ALL"><option value="ALL">Todos os jogos</option><option value="MINIMUM">Quantidade mínima</option></select></label>
          <label>Mínimo de jogos<input name="minimumParticipations" type="number" min="1" defaultValue="1" /></label>
          <label>XP por participação<input name="participationXp" type="number" min="0" max="100" defaultValue="0" /></label>
          <label>Moedas por vitória<input name="victoryCoins" type="number" min="0" max="20" defaultValue="0" /></label>
          <label>Bônus de conclusão (XP)<input name="completionBonusXp" type="number" min="0" max="250" defaultValue="0" /></label>
          <label>Bônus perfeito (moedas)<input name="perfectBonusCoins" type="number" min="0" max="50" defaultValue="0" /></label>
        </div>
        <div className="admin-event-suggest">
          <label>Sugestão automática<select name="suggestGame"><option value="wordle-biblico">Wordle</option><option value="quiz-biblico">Quiz</option><option value="linha-do-tempo-biblica">Linha do Tempo</option><option value="memoria-biblica">Memória</option><option value="associacao-de-temas">Associação</option><option value="quem-sou-eu">Quem Sou Eu?</option><option value="jogo-tres-pistas">Três Pistas</option></select></label>
          <button type="button" onClick={suggest}>Sugerir conteúdo</button>
        </div>
        <label>Jogos e conteúdos (JSON)<textarea name="games" required rows={10} placeholder='[{"gameType":"wordle-biblico","contentItems":[{"contentId":"...","contentVersion":1}]}]' /></label>
        <button className="primary">{editingId ? "ATUALIZAR RASCUNHO" : "SALVAR RASCUNHO"}</button>
        {editingId ? <button type="button" onClick={() => { formRef.current?.reset(); setEditingId(""); }}>Cancelar edição</button> : null}
      </form>
      <section className="admin-panel">
        <h2>Eventos</h2>
        {events.map(item => <article className="admin-event-row" key={item.id}>
          <div><strong>{item.title}</strong><small>{item.status} · {new Date(item.startsAt).toLocaleString("pt-BR")}</small></div>
          {item.status === "DRAFT" ? <button onClick={() => edit(item.id)}>Editar</button> : null}
          <button onClick={() => action(item.id, "validate")}>Validar</button>
          {item.status === "DRAFT" ? <button onClick={() => action(item.id, "schedule")}>Agendar</button> : null}
          {item.status === "SCHEDULED" || item.status === "ACTIVE" ? <button className="danger" onClick={() => action(item.id, "cancel")}>Cancelar</button> : null}
        </article>)}
        {events.length === 0 ? <p className="empty">Nenhum evento criado.</p> : null}
      </section>
    </section>
    {message ? <p className="auth-message" role="status">{message}</p> : null}
  </main>;
}
