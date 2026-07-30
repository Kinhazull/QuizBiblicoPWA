import { GameCard } from "../GameCard";
import { gameCatalog } from "../data/gameCatalog";

export default function GamesPage() {
  return <main className="games-catalog-page"><div className="games-page-ambient" aria-hidden="true" /><div className="games-page-inner">
    <header className="games-page-heading"><p>Jogos e desafios bíblicos</p><h1>Escolha seu próximo <em>desafio</em></h1><span>Aprenda sobre toda a Bíblia de forma leve, divertida e no seu ritmo.</span></header>
    <a className="free-play-entry" href="/jogos/modo-livre">
      <span aria-hidden="true">∞</span>
      <strong>Modo Livre</strong>
      <small>Escolha o jogo e personalize sua próxima partida.</small>
      <b aria-hidden="true">→</b>
    </a>
    <section className="games-catalog-grid" aria-label="Catálogo de jogos">{gameCatalog.map(game => <GameCard game={game} key={game.id} />)}</section>
  </div></main>;
}
