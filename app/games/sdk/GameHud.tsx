import type { GamePlayStatus } from "./types";

const STATUS_LABELS: Record<GamePlayStatus, string> = {
  playing: "Em andamento",
  won: "Vitória",
  lost: "Fim de jogo",
};

export function GameHud({ status, currentAttempt, maxAttempts, progressLabel = "Tentativa" }: {
  status: GamePlayStatus;
  currentAttempt: number;
  maxAttempts: number;
  progressLabel?: string;
}) {
  return (
    <div className="game-sdk-hud" aria-label="Informações da partida">
      <span><small>Status</small><strong>{STATUS_LABELS[status]}</strong></span>
      <span><small>{progressLabel}</small><strong>{Math.min(currentAttempt, maxAttempts)} de {maxAttempts}</strong></span>
      <div className="game-sdk-progress" role="progressbar" aria-label={`Progresso: ${progressLabel}`} aria-valuemin={0} aria-valuemax={maxAttempts} aria-valuenow={Math.min(currentAttempt, maxAttempts)}>
        <i style={{ width: `${maxAttempts ? Math.min(100, (currentAttempt / maxAttempts) * 100) : 0}%` }} />
      </div>
    </div>
  );
}
