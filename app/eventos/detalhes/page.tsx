"use client";

import { useEffect, useState } from "react";

type EventGame = { gameType: string; title?: string; status: "CREATED" | "STARTED" | "FINISHED" | "EXPIRED"; outcome: string | null; selectionId: string; playHref: string | null };
type EventDetail = { id: string; title: string; description: string; startsAt: number; endsAt: number; status: string; games: EventGame[]; rewards: Record<string, number> };

export default function EventDetailPage() {
  const [id, setId] = useState(""); const [event, setEvent] = useState<EventDetail | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  useEffect(() => { const value = new URLSearchParams(location.search).get("id") || ""; setId(value); if (!value) { setError("Evento inválido."); return; } void fetch(`/api/platform/events/${encodeURIComponent(value)}`, { cache: "no-store" }).then(async response => { if (!response.ok) throw new Error("event_unavailable"); setEvent((await response.json()).event); }).catch(() => setError("Evento indisponível.")); }, []);
  async function start(game: EventGame) { setBusy(game.selectionId); setError(""); try { const response = await fetch(`/api/platform/events/${encodeURIComponent(id)}/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ selectionId: game.selectionId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); location.href = data.playHref || game.playHref || "/eventos"; } catch { setError("Não foi possível iniciar este jogo."); setBusy(""); } }
  if (!event) return <main className="event-shell"><p className="event-message" role={error ? "alert" : "status"}>{error || "Carregando evento…"}</p></main>;
  return <main className="event-shell"><header><p>{event.status === "ACTIVE" ? "Evento ativo" : event.status === "SCHEDULED" ? "Próximo evento" : "Evento encerrado"}</p><h1>{event.title}</h1><span>{event.description}</span><small>{new Date(event.startsAt).toLocaleString("pt-BR")} – {new Date(event.endsAt).toLocaleString("pt-BR")}</small></header>
    {error ? <p className="event-message" role="alert">{error}</p> : null}<section className="event-games"><h2>Jogos participantes</h2>{event.games.map(game => <article key={game.gameType}><div><strong>{game.title || game.gameType}</strong><small>{game.status === "FINISHED" ? `Finalizado${game.outcome ? ` · ${game.outcome === "won" ? "Vitória" : "Derrota"}` : ""}` : game.status === "STARTED" ? "Em andamento" : "Uma tentativa disponível"}</small></div>
      <button type="button" disabled={event.status !== "ACTIVE" || game.status === "FINISHED" || busy === game.selectionId} onClick={() => start(game)}>{game.status === "FINISHED" ? "Concluído" : busy === game.selectionId ? "Aguarde…" : game.status === "STARTED" ? "Continuar" : "Jogar"}</button></article>)}</section>
    <section className="event-rewards"><h2>Premiações</h2><p>Participação: {event.rewards.participationXp} XP · Vitória: {event.rewards.victoryCoins} moedas</p></section>
  </main>;
}
