"use client";

import { useEffect, useState } from "react";
import type { PlatformEventSummary } from "../PlatformHome";

export default function EventsPage() {
  const [events, setEvents] = useState<PlatformEventSummary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/platform/events", { cache: "no-store" }).then(async response => {
    if (!response.ok) throw new Error("events_unavailable");
    setEvents((await response.json()).events || []);
  }).catch(() => setError("Não foi possível carregar os eventos.")); }, []);
  return <main className="event-shell"><header><p>Eventos da plataforma</p><h1>Jogue por um objetivo em comum</h1><span>Participe durante o período indicado. Cada jogo permite uma única tentativa.</span></header>
    {error ? <p className="event-message" role="alert">{error}</p> : null}
    {!events && !error ? <p className="event-message" role="status">Carregando eventos…</p> : null}
    <section className="event-list" aria-label="Eventos disponíveis">{events?.map(event => <article key={event.id}>
      <span className={`event-badge ${event.status.toLowerCase()}`}>{event.status === "ACTIVE" ? "Ativo" : event.status === "SCHEDULED" ? "Em breve" : "Encerrado"}</span>
      <h2>{event.title}</h2><p>{event.description}</p><small>{new Date(event.startsAt).toLocaleString("pt-BR")} – {new Date(event.endsAt).toLocaleString("pt-BR")}</small>
      <a href={`/eventos/detalhes?id=${encodeURIComponent(event.id)}`}>Ver detalhes</a>
    </article>)}{events?.length === 0 ? <p className="event-message">Nenhum evento disponível agora.</p> : null}</section>
  </main>;
}
