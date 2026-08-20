"use client";

import { useEffect, useState } from "react";
import type { GameType } from "../../../shared/content";
import { GameMode, getModeCapability } from "../../../shared/game-modes";
import { generateFreePlayGame } from "../loader";
import type { GamePlayStatus } from "./types";

export function GameResult({ status, mode = GameMode.NORMAL, gameType, onRestart }: {
  status: Exclude<GamePlayStatus, "playing">;
  mode?: GameMode;
  gameType: GameType;
  onRestart: () => void;
}) {
  const won = status === "won";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<{ score: number; processing: string } | null>(null);
  const canReplay = getModeCapability(mode)?.replayable !== false;
  const eventId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("eventId");
  const returnHref = mode === GameMode.EVENT
    ? eventId ? `/eventos/detalhes?id=${encodeURIComponent(eventId)}` : "/eventos"
    : mode === GameMode.DAILY
      ? "/desafios-diarios"
    : "/jogos";

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("platform:last-game-result") || "null");
      if (stored?.gameId === gameType) setSummary({ score: Number(stored.score) || 0, processing: String(stored.processing || "pending") });
    } catch { setSummary(null); }
  }, [gameType]);

  async function replay() {
    if (mode !== GameMode.FREE_PLAY) {
      onRestart();
      return;
    }
    setBusy(true);
    setError("");
    try {
      location.replace(await generateFreePlayGame(gameType));
    } catch {
      setError("Não foi possível preparar outra partida.");
      setBusy(false);
    }
  }

  return <section className={`game-sdk-result ${status}`} aria-labelledby="game-result-title">
    <span className="game-sdk-result-icon" aria-hidden="true">{won ? "★" : "↻"}</span>
    <div>
      <p>{mode === GameMode.DAILY ? "Resultado diário" : mode === GameMode.EVENT ? "Resultado do evento" : won ? "Desafio concluído" : "Tentativas encerradas"}</p>
      <h2 id="game-result-title">{won ? "Você venceu!" : "Não foi desta vez"}</h2>
      <span>{won ? "Muito bem! Seu resultado foi registrado." : "Seu resultado foi registrado. Continue explorando os desafios bíblicos."}</span>
      {summary && <dl className="game-sdk-result-summary"><div><dt>Pontuação</dt><dd>{summary.score.toLocaleString("pt-BR")}</dd></div><div><dt>Progressão</dt><dd>{summary.processing === "completed" ? "XP, moedas e objetivos atualizados" : "Atualizando XP, moedas e objetivos…"}</dd></div></dl>}
    </div>
    <div className="game-sdk-result-actions">
      {canReplay ? <button disabled={busy} type="button" onClick={replay}>{busy ? "Preparando..." : "Jogar novamente"}</button> : null}
      <a href={returnHref}>{mode === GameMode.EVENT ? "Voltar ao evento" : mode === GameMode.DAILY ? "Voltar aos desafios" : "Voltar aos Jogos"}</a>
    </div>
    {error ? <p className="game-sdk-result-error" role="alert">{error}</p> : null}
  </section>;
}
