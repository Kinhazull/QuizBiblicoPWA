import type { GamePlayStatus } from "./types";

export function GameResult({ status, onRestart }: {
  status: Exclude<GamePlayStatus, "playing">;
  onRestart: () => void;
}) {
  const won = status === "won";
  return (
    <section className={`game-sdk-result ${status}`} aria-labelledby="game-result-title">
      <span className="game-sdk-result-icon" aria-hidden="true">{won ? "★" : "↻"}</span>
      <div>
        <p>{won ? "Desafio concluído" : "Tentativas encerradas"}</p>
        <h2 id="game-result-title">{won ? "Você venceu!" : "Não foi desta vez"}</h2>
        <span>{won ? "Muito bem! Continue explorando os desafios bíblicos." : "Você pode reiniciar e tentar novamente quando quiser."}</span>
      </div>
      <div className="game-sdk-result-actions">
        <button type="button" onClick={onRestart}>Jogar novamente</button>
        <a href="/jogos/modo-livre">Nova partida livre</a>
        <a href="/">Voltar para Home</a>
      </div>
    </section>
  );
}

