import { notFound } from "next/navigation";
import { gameCatalog, getGameBySlug } from "../../data/gameCatalog";

export const dynamicParams = false;
export function generateStaticParams() { return gameCatalog.map(game => ({ slug: game.slug })); }

export default async function GameDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const game = getGameBySlug((await params).slug);
  if (!game) notFound();
  const available = game.status === "available";
  return <main className="game-details-page"><div className="games-page-ambient" aria-hidden="true" /><article className="game-details-card">
    <a className="game-details-back" href="/jogos">← Voltar para jogos</a>
    <div className="game-details-art" role="img" aria-label={`Ilustração temporária de ${game.name}`}>{game.image}</div>
    <div className="game-details-content"><span className={`games-status ${available ? "available" : "development"}`}><i aria-hidden="true" />{available ? "Disponível" : "Em desenvolvimento"}</span><h1>{game.name}</h1><p className="game-details-description">{game.description}</p>
      <section><h2>Objetivo</h2><p>{game.objective}</p></section><section><h2>Como funciona</h2><ul>{game.mechanics.map(item => <li key={item}>{item}</li>)}</ul></section>
      {available ? <a className="games-card-action" href={game.route}>Jogar <span aria-hidden="true">→</span></a> : <button className="game-notify-button" type="button">Avise-me quando lançar</button>}
      {!available && <small className="game-notify-note">A notificação ainda é uma prévia visual e não realiza cadastro.</small>}
    </div>
  </article></main>;
}
