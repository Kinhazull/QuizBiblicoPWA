"use client";

import { useState } from "react";
import type { GameType } from "../shared/content";
import type { PlatformGame } from "./data/gameCatalog";
import { generateFreePlayGame } from "./games/loader";
import { GameArt } from "./GameArt";

export function GameCard({ game }: { game: PlatformGame }) {
  const available = game.status === "available";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function play() {
    if (!available || busy) return;
    setBusy(true);
    setError("");
    try {
      location.href = await generateFreePlayGame(game.id as GameType);
    } catch {
      setError("Não foi possível iniciar a partida. Tente novamente.");
      setBusy(false);
    }
  }

  return <article className="games-catalog-card">
    <div className="games-catalog-art"><GameArt art={game.art} fallback={game.image} /></div>
    <div className="games-catalog-copy">
      <span className={`games-status ${available ? "available" : "development"}`}>
        <i aria-hidden="true" />{available ? "Disponível" : "Em desenvolvimento"}
      </span>
      <h2>{game.name}</h2>
      <p>{game.shortDescription}</p>
      {available
        ? <button className="games-card-action" disabled={busy} onClick={play} type="button">
          {busy ? "Preparando..." : game.primaryButton}<span aria-hidden="true">→</span>
        </button>
        : <a className="games-card-action" href={game.route}>Ver detalhes<span aria-hidden="true">→</span></a>}
      {error ? <small className="games-card-error" role="alert">{error}</small> : null}
    </div>
  </article>;
}
