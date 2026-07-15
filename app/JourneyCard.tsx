import { getJourneyCardView, type JourneyCardData } from "./journey-card-state";

export default function JourneyCard({ data, remaining }: { data: JourneyCardData | null; remaining: (target?: number) => string }) {
  const view = getJourneyCardView(data, remaining);
  return <section className={`weekly-journey-card ${view.tone}`} aria-labelledby="weekly-journey-title">
    <header><span aria-hidden="true">✦</span><div><small>{view.eyebrow}</small><h2 id="weekly-journey-title">{view.title}</h2></div></header>
    <p>{view.detail}</p>{view.meta && <small className="journey-card-meta">{view.meta}</small>}
    <a className={`journey-card-action ${view.href === "#" ? "disabled" : ""}`} href={view.href} aria-disabled={view.href === "#"}>{view.action}<span aria-hidden="true">→</span></a>
  </section>;
}
