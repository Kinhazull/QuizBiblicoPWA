"use client";

import { useState } from "react";
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
  const canReplay = getModeCapability(mode)?.replayable !== false;
  const returnHref = mode === GameMode.DAILY || mode === GameMode.EVENT
    ? "/desafios-diarios"
    : "/jogos";

  async function replay() {
    if (mode !== GameMode.FREE_PLAY) {
      onRestart();
      return;
    }
    setBusy(true);
    setError("");
    try {
      location.href = await generateFreePlayGame(gameType);
    } catch {
      setError("Não foi possível preparar outra partida.");
      setBusy(false);
    }
  }

  return <section className={`game-sdk-result ${status}`} aria-labelledby="game-result-title">
    <span className="game-sdk-result-icon" aria-hidden="true">{won ? "★" : "↻"}</span>
    <div>
      <p>{mode === GameMode.DAILY ? "Resultado diário" : won ? "Desafio concluído" : "Tentativas encerradas"}</p>
      <h2 id="game-result-title">{won ? "Você venceu!" : "Não foi desta vez"}</h2>
      <span>{won ? "Muito bem! Seu resultado foi registrado." : "Seu resultado foi registrado. Continue explorando os desafios bíblicos."}</span>
    </div>
    <div className="game-sdk-result-actions">
      {canReplay ? <button disabled={busy} type="button" onClick={replay}>{busy ? "Preparando..." : "Jogar novamente"}</button> : null}
      <a href={returnHref}>{mode === GameMode.DAILY || mode === GameMode.EVENT ? "Voltar aos desafios" : "Voltar aos Jogos"}</a>
    </div>
    {error ? <p className="game-sdk-result-error" role="alert">{error}</p> : null}
  </section>;
}
