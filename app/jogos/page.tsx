import { GameCard } from "../GameCard";
import { gameCatalog } from "../data/gameCatalog";

export default function GamesPage() {
  return <main className="games-catalog-page">
    <div className="games-page-ambient" aria-hidden="true" />
    <div className="games-page-inner">
      <header className="games-page-heading">
        <p>Jogos e desafios bíblicos</p>
        <h1>Escolha e comece a <em>jogar</em></h1>
        <span>Uma nova partida é preparada automaticamente para você.</span>
      </header>
      <section className="games-catalog-grid" aria-label="Catálogo de jogos">
        {gameCatalog.map(game => <GameCard game={game} key={game.id} />)}
      </section>
    </div>
  </main>;
}
