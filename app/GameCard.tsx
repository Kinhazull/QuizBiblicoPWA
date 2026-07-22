import type { PlatformGame } from "./data/gameCatalog";

export function GameCard({ game }: { game: PlatformGame }) {
  const available = game.status === "available";
  return <article className="games-catalog-card">
    <div className="games-catalog-art" role="img" aria-label={`Ilustração temporária de ${game.name}`}>{game.image}</div>
    <div className="games-catalog-copy">
      <span className={`games-status ${available ? "available" : "development"}`}><i aria-hidden="true" />{available ? "Disponível" : "Em desenvolvimento"}</span>
      <h2>{game.name}</h2><p>{game.shortDescription}</p>
      <a className="games-card-action" href={game.route}>{game.primaryButton}<span aria-hidden="true">→</span></a>
    </div>
  </article>;
}
