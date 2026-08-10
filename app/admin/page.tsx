"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandIcon, type IconName } from "../navigation";

type DashboardHealth = "healthy" | "attention";
type OperationalHealth = "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN";
type AttentionSeverity = "critical" | "warning" | "info";
type EventSummary = { id: string; title: string; status: string; startsAt: number; endsAt: number };

type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  count: number;
  title: string;
  description: string;
  href: string;
  action: string;
};

type Dashboard = {
  metrics: { pending: number; members: number; rounds: number; review: number; health: DashboardHealth };
  health: { status: OperationalHealth; checkedAt: number };
  usage: { activeUsers: number; started: number; completed: number; completionRate: number };
  events: { active: EventSummary | null; next: EventSummary | null };
  content: { needsReview: number; published: number; available: number; unprojected: number };
  reservations: { active: number; expired: number };
  recent: Array<{ action: string; entityType: string; createdAt: number }>;
  attention: AttentionItem[];
};

type MetricCard = { icon: IconName; title: string; description: string; value: number | string; href: string; status?: DashboardHealth };

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const shortcuts: Array<{ icon: IconName; title: string; description: string; href: string }> = [
  { icon: "database", title: "Biblioteca", description: "Acervo e fluxo editorial", href: "/admin/conteudo/acervo" },
  { icon: "calendar", title: "Eventos", description: "Criar, validar e agendar", href: "/admin/eventos" },
  { icon: "chart", title: "Analytics", description: "Uso detalhado da plataforma", href: "/admin/analytics" },
  { icon: "health", title: "Health", description: "Diagnóstico operacional completo", href: "/admin/diagnostico" },
  { icon: "users", title: "Usuários", description: "Acessos e participantes", href: "/admin/membros" },
  { icon: "review", title: "Revisão", description: "Conteúdos aguardando decisão", href: "/admin/conteudo/acervo?status=IN_REVIEW" },
];

function isDashboard(value: unknown): value is Dashboard {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<Dashboard>;
  return Boolean(
    data.metrics && data.health && data.usage && data.events && data.content && data.reservations &&
    Array.isArray(data.recent) && Array.isArray(data.attention),
  );
}

function attentionIcon(severity: AttentionSeverity): IconName {
  return severity === "critical" ? "shield" : severity === "warning" ? "health" : "bell";
}

function healthLabel(status: OperationalHealth) {
  return ({ HEALTHY: "Saudável", DEGRADED: "Degradado", CRITICAL: "Crítico", UNKNOWN: "Indisponível" } as const)[status];
}

function eventDate(value: number) {
  return Number.isFinite(value) ? dateFormatter.format(new Date(value)) : "Data indisponível";
}

function activityLabel(value: string) {
  return value.replaceAll("_", " ").replaceAll(".", " › ");
}

export default function AdminHub() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback((signal: AbortSignal) => {
    setIsLoading(true);
    setError("");
    return fetch("/api/admin/dashboard", { cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" }, signal })
      .then(async response => {
        if (response.status === 401 || response.status === 403) { window.location.replace("/"); return null; }
        if (!response.ok) throw new Error("dashboard_request_failed");
        const payload: unknown = await response.json();
        if (!isDashboard(payload)) throw new Error("dashboard_invalid_payload");
        return payload;
      })
      .then(payload => { if (payload) setData(payload); })
      .catch(problem => {
        if (problem instanceof DOMException && problem.name === "AbortError") return;
        setError("Não foi possível carregar a Central Administrativa. Tente novamente.");
      })
      .finally(() => { if (!signal.aborted) setIsLoading(false); });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard, reloadKey]);

  const metrics = useMemo<MetricCard[]>(() => data ? [
    { icon: "health", title: "Saúde operacional", description: `Verificada às ${new Date(data.health.checkedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, value: healthLabel(data.health.status), href: "/admin/diagnostico", status: data.health.status === "HEALTHY" ? "healthy" : "attention" },
    { icon: "users", title: "Usuários ativos hoje", description: `${numberFormatter.format(data.metrics.members)} membros com acesso`, value: data.usage.activeUsers, href: "/admin/analytics?period=today" },
    { icon: "gamepad", title: "Partidas hoje", description: `${numberFormatter.format(data.usage.completed)} concluídas`, value: data.usage.started, href: "/admin/analytics?period=today" },
    { icon: "review", title: "Aguardando revisão", description: "Fluxo editorial universal", value: data.content.needsReview, href: "/admin/conteudo/acervo?status=IN_REVIEW" },
    { icon: "database", title: "Conteúdo disponível", description: `${numberFormatter.format(data.content.published)} publicados`, value: data.content.available, href: "/admin/conteudo/acervo" },
  ] : [], [data]);

  return <main className="admin-shell admin-hub">
    <section className="admin-title" aria-labelledby="admin-hub-title">
      <p className="eyebrow">ADMINISTRAÇÃO</p>
      <h1 id="admin-hub-title">Central <em>Administrativa</em></h1>
      <p>Uma visão rápida da saúde, uso, eventos e conteúdo da plataforma. Abra os módulos especializados para investigar ou agir.</p>
    </section>

    <section className="attention-section" aria-labelledby="attention-title">
      <header><div><p className="eyebrow">PRIORIDADE</p><h2 id="attention-title">Requer atenção</h2></div><a href="/admin/diagnostico">Abrir Health detalhado</a></header>
      {isLoading && !data && <p className="dashboard-state" role="status" aria-live="polite">Carregando sinais operacionais…</p>}
      {error && <div className="dashboard-state error" role="alert"><p>{error}</p><button type="button" onClick={() => setReloadKey(key => key + 1)} disabled={isLoading}>{isLoading ? "Carregando…" : "Tentar novamente"}</button></div>}
      {data && data.attention.length === 0 && <div className="attention-empty" role="status"><BrandIcon name="health" /><div><strong>Plataforma saudável, sem pendências relevantes</strong><span>Os sinais operacionais disponíveis não exigem ação neste momento.</span></div></div>}
      {data && data.attention.length > 0 && <div className="attention-list">{data.attention.map(item => <article className={`attention-item ${item.severity}`} key={item.id}><BrandIcon name={attentionIcon(item.severity)} /><div className="attention-copy"><div className="attention-heading"><strong>{item.title}</strong>{item.count > 0 && <span className="attention-count" aria-label={`${item.count} ocorrências`}>{numberFormatter.format(item.count)}</span>}</div><p>{item.description}</p></div><a href={item.href}>{item.action}</a></article>)}</div>}
    </section>

    <section className="hub-summary" aria-label="Indicadores essenciais" aria-busy={isLoading}>
      {isLoading && !data ? Array.from({ length: 5 }, (_, index) => <div className="metric-skeleton" key={index} aria-hidden="true" />) : metrics.map(metric => <a href={metric.href} key={metric.title} className={metric.status ? `metric-card ${metric.status}` : "metric-card"}><BrandIcon name={metric.icon} /><strong>{typeof metric.value === "number" ? numberFormatter.format(metric.value) : metric.value}</strong><div><span>{metric.title}</span><small>{metric.description}</small></div></a>)}
    </section>

    {data && <section className="admin-overview-grid" aria-label="Resumo operacional">
      <article className="admin-panel overview-card"><header><BrandIcon name="calendar" /><div><h2>Eventos</h2><p>Evento em andamento e próxima programação.</p></div></header><EventLine label="Ativo" event={data.events.active} empty="Nenhum Evento ativo." /><EventLine label="Próximo" event={data.events.next} empty="Nenhum Evento agendado." /><a className="overview-action" href="/admin/eventos">Gerenciar Eventos →</a></article>
      <article className="admin-panel overview-card"><header><BrandIcon name="database" /><div><h2>Conteúdo e reservas</h2><p>Saúde editorial e disponibilidade operacional.</p></div></header><dl className="overview-stats"><div><dt>Publicados</dt><dd>{numberFormatter.format(data.content.published)}</dd></div><div><dt>Disponíveis</dt><dd>{numberFormatter.format(data.content.available)}</dd></div><div><dt>Em revisão</dt><dd>{numberFormatter.format(data.content.needsReview)}</dd></div><div><dt>Sem projeção</dt><dd>{numberFormatter.format(data.content.unprojected)}</dd></div><div><dt>Reservas ativas</dt><dd>{numberFormatter.format(data.reservations.active)}</dd></div><div><dt>Reservas expiradas</dt><dd>{numberFormatter.format(data.reservations.expired)}</dd></div></dl><a className="overview-action" href="/admin/conteudo">Abrir Central de Conteúdo →</a></article>
      <article className="admin-panel overview-card recent-card"><header><BrandIcon name="activity" /><div><h2>Atividade recente</h2><p>Últimos registros administrativos e operacionais confiáveis.</p></div></header>{data.recent.length ? <ol>{data.recent.map((item, index) => <li key={`${item.action}:${item.createdAt}:${index}`}><span>{activityLabel(item.action)}</span><small>{item.entityType} · {eventDate(item.createdAt)}</small></li>)}</ol> : <p className="overview-empty">Nenhuma atividade registrada.</p>}</article>
    </section>}

    <section className="admin-panel admin-shortcuts" aria-labelledby="shortcuts-title"><header><BrandIcon name="home" /><div><h2 id="shortcuts-title">Atalhos operacionais</h2><p>Acesse diretamente os módulos responsáveis por cada ação.</p></div></header><nav aria-label="Atalhos administrativos">{shortcuts.map(item => <a href={item.href} key={item.href}><BrandIcon name={item.icon} /><span><strong>{item.title}</strong><small>{item.description}</small></span><b aria-hidden="true">→</b></a>)}</nav></section>
  </main>;
}

function EventLine({ label, event, empty }: { label: string; event: EventSummary | null; empty: string }) {
  return <div className="event-line"><span>{label}</span>{event ? <div><strong>{event.title}</strong><small>{eventDate(event.startsAt)} — {eventDate(event.endsAt)}</small></div> : <p>{empty}</p>}</div>;
}
