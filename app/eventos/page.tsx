"use client";

import { useEffect, useState } from "react";
import type { PlatformEventSummary } from "../PlatformHome";
import { eventIllustration, PlatformIllustration } from "../PlatformIllustration";

export default function EventsPage() {
  const [events, setEvents] = useState<PlatformEventSummary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/platform/events", { cache: "no-store" }).then(async response => {
    if (!response.ok) throw new Error("events_unavailable");
    setEvents((await response.json()).events || []);
  }).catch(() => setError("Não foi possível carregar os eventos.")); }, []);
  return <main className="event-shell"><header><p>Eventos da plataforma</p><h1>Jogue por um objetivo em comum</h1><span>Participe durante o período indicado. Cada jogo permite uma única tentativa.</span></header>
    {error ? <section className="event-message event-state" role="alert"><PlatformIllustration id="error-state" /><strong>{error}</strong><button type="button" onClick={() => location.reload()}>Tentar novamente</button></section> : null}
    {!events && !error ? <p className="event-message" role="status">Carregando eventos…</p> : null}
    <section className="event-list" aria-label="Eventos disponíveis">{events?.map((event, index) => <article key={event.id}>
      <PlatformIllustration id={eventIllustration(event.status)} customUrl={event.coverUrl} className="event-card-art" eager={index === 0} />
      <span className={`event-badge ${event.status.toLowerCase()}`}>{event.status === "ACTIVE" ? "Ativo" : event.status === "SCHEDULED" ? "Em breve" : "Encerrado"}</span>
      <h2>{event.title}</h2><p>{event.description}</p><small>{new Date(event.startsAt).toLocaleString("pt-BR")} – {new Date(event.endsAt).toLocaleString("pt-BR")}</small>
      <a href={`/eventos/detalhes?id=${encodeURIComponent(event.id)}`}>Ver detalhes</a>
    </article>)}{events?.length === 0 ? <div className="event-message event-state"><PlatformIllustration id="empty-state" /><strong>Nenhum evento disponível agora.</strong><span>Novos eventos aparecerão aqui quando forem agendados.</span></div> : null}</section>
  </main>;
}
