import { getJourneyCardView, type JourneyCardData } from "./journey-card-state";

const icons: Record<string, string> = { waiting: "📅", available: "▶", active: "▶", recorded: "🏆", completed: "✓", closed: "🏁", training: "🎯" };

export default function JourneyCard({ data, remaining }: { data: JourneyCardData | null; remaining: (target?: number) => string }) {
  const view = getJourneyCardView(data, remaining), current = data?.current, completion = data?.completion, attempts = completion?.optionalAttemptsRemaining || 0;
  const displayScore = completion?.bestScore ?? data?.recent?.bestScore ?? 0;
  const showOfficialResult = view.tone !== "training" && (Boolean(completion?.completed) || Number(data?.recent?.bestScore || 0) > 0);
  return <div className={`weekly-journey ${view.tone}`}>
    <section className="weekly-journey-card" aria-labelledby="weekly-journey-title">
      <header><span className="journey-state-icon" aria-hidden="true">{icons[view.tone] || "✦"}</span><div><small>{view.eyebrow} <b aria-hidden="true">✓</b></small><span>Tema da Jornada</span><h2 id="weekly-journey-title">{current?.theme || view.title}</h2></div><span className="journey-achievement" aria-hidden="true">✦</span></header>
      {showOfficialResult && <div className="journey-results"><article><span aria-hidden="true">🏆</span><div><small>Melhor resultado</small><strong>{Number(displayScore).toLocaleString("pt-BR")} <em>pontos</em></strong></div></article><article><span aria-hidden="true">★</span><div><small>Sua colocação</small><strong>{data?.ranking?.position ? `${data.ranking.position}º` : "—"} <em>{data?.ranking?.provisional ? "Provisório" : "Resultado final"}</em></strong></div></article></div>}
      {current && <div className="journey-timing"><span><b aria-hidden="true">◷</b><strong>{current.secondsPerQuestion || 20} segundos</strong><small>por pergunta</small></span><span><b aria-hidden="true">▣</b><strong>Encerra em</strong><small>{remaining(current.closesAt)}</small></span></div>}
      <p className="journey-context">💡 {completion?.completed && attempts > 0 && view.tone !== "training" ? <>Você ainda possui <b>{attempts} tentativa(s)</b> para melhorar seu resultado nesta Jornada.</> : view.detail}</p>
      {!current && view.meta && <small className="journey-card-meta">{view.meta}</small>}
    </section>
    <a className={`journey-card-action ${view.href === "#" ? "disabled" : ""}`} href={view.href} aria-disabled={view.href === "#"}>{view.action}<span aria-hidden="true">→</span></a>
  </div>;
}
