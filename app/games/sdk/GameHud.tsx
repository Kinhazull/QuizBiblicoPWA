import type { GamePlayStatus } from "./types";

const STATUS_LABELS: Record<GamePlayStatus, string> = {
  playing: "Em andamento",
  won: "Vitória",
  lost: "Fim de jogo",
};

export function GameHud({ status, currentAttempt, maxAttempts }: {
  status: GamePlayStatus;
  currentAttempt: number;
  maxAttempts: number;
}) {
  return (
    <div className="game-sdk-hud" aria-label="Informações da partida">
      <span><small>Status</small><strong>{STATUS_LABELS[status]}</strong></span>
      <span><small>Tentativa</small><strong>{Math.min(currentAttempt, maxAttempts)} de {maxAttempts}</strong></span>
    </div>
  );
}

