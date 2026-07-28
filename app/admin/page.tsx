"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminNavigation,
  BrandIcon,
  type IconName,
  type NavigationGroup,
} from "../navigation";

type DashboardHealth = "healthy" | "attention";
type AttentionSeverity = "critical" | "warning" | "info";

type DashboardMetrics = {
  pending: number;
  members: number;
  rounds: number;
  review: number;
  health: DashboardHealth;
};

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
  metrics: DashboardMetrics;
  attention: AttentionItem[];
};

type MetricCard = {
  icon: IconName;
  title: string;
  description: string;
  value: number | string;
  href: string;
  status?: DashboardHealth;
};

const dashboardGroups: NavigationGroup[] = adminNavigation.slice(1);

const groupDescriptions: Record<string, string> = {
  Usuários: "Participantes, aprovações, convites, permissões e comunicados.",
  Conteúdo: "Acervo, revisão editorial, importação e colaboração.",
  "Quiz Bíblico": "Jornadas, calendário e temporadas do Quiz.",
  Jogos: "Catálogo, conteúdo e acompanhamento dos jogos bíblicos.",
  Progressão: "XP, níveis, missões, conquistas e retenção dos participantes.",
  Economia: "Saldos, recompensas, inventário e itens da plataforma.",
  Operações: "Relatórios, auditoria, privacidade e integridade do sistema.",
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

function isAttentionSeverity(value: unknown): value is AttentionSeverity {
  return value === "critical" || value === "warning" || value === "info";
}

function isDashboard(value: unknown): value is Dashboard {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Dashboard>;
  const metrics = candidate.metrics;

  if (!metrics || typeof metrics !== "object") return false;

  const validMetrics =
    typeof metrics.pending === "number" &&
    typeof metrics.members === "number" &&
    typeof metrics.rounds === "number" &&
    typeof metrics.review === "number" &&
    (metrics.health === "healthy" || metrics.health === "attention");

  const validAttention =
    Array.isArray(candidate.attention) &&
    candidate.attention.every(
      (item) =>
        Boolean(item) &&
        typeof item.id === "string" &&
        isAttentionSeverity(item.severity) &&
        typeof item.count === "number" &&
        typeof item.title === "string" &&
        typeof item.description === "string" &&
        typeof item.href === "string" &&
        typeof item.action === "string",
    );

  return validMetrics && validAttention;
}

function attentionIcon(severity: AttentionSeverity): IconName {
  if (severity === "critical") return "shield";
  if (severity === "warning") return "health";
  return "bell";
}

function formatMetricValue(value: number | string) {
  return typeof value === "number" ? numberFormatter.format(value) : value;
}

export default function AdminHub() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback((signal: AbortSignal) => {
    setIsLoading(true);
    setError("");

    return fetch("/api/admin/dashboard", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          window.location.replace("/");
          return null;
        }

        if (!response.ok) throw new Error("dashboard_request_failed");

        const payload: unknown = await response.json();
        if (!isDashboard(payload)) throw new Error("dashboard_invalid_payload");

        return payload;
      })
      .then((payload) => {
        if (payload) setData(payload);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("Não foi possível carregar a visão geral. Tente novamente.");
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard, reloadKey]);

  const metrics = useMemo<MetricCard[]>(() => {
    if (!data) return [];

    return [
      {
        icon: "users",
        title: "Aprovações pendentes",
        description: "Cadastros aguardando decisão",
        value: data.metrics.pending,
        href: "/admin/acessos",
      },
      {
        icon: "users",
        title: "Membros ativos",
        description: "Participantes com acesso",
        value: data.metrics.members,
        href: "/admin/membros",
      },
      {
        icon: "calendar",
        title: "Jornadas cadastradas",
        description: "Histórico e programação",
        value: data.metrics.rounds,
        href: "/admin/rodadas/lista",
      },
      {
        icon: "review",
        title: "Perguntas em revisão",
        description: "Conteúdo aguardando avaliação",
        value: data.metrics.review,
        href: "/admin/perguntas/revisao",
      },
      {
        icon: "health",
        title: "Saúde do sistema",
        description: "Integridade operacional",
        value: data.metrics.health === "healthy" ? "Saudável" : "Atenção",
        href: "/admin/diagnostico",
        status: data.metrics.health,
      },
    ];
  }, [data]);

  const retry = () => setReloadKey((current) => current + 1);

  return (
    <main className="admin-shell admin-hub">
      <section className="admin-title" aria-labelledby="admin-hub-title">
        <p className="eyebrow">ADMINISTRAÇÃO</p>
        <h1 id="admin-hub-title">
          Central de <em>Gestão</em>
        </h1>
        <p>
          Controle completo do Conte os Feitos. Acompanhe prioridades, indicadores e acesse
          rapidamente todos os módulos administrativos.
        </p>
      </section>

      <section className="attention-section" aria-labelledby="attention-title">
        <header>
          <div>
            <p className="eyebrow">PRIORIDADES</p>
            <h2 id="attention-title">Precisa de atenção</h2>
          </div>
          <a href="/admin/diagnostico">Abrir diagnóstico</a>
        </header>

        {isLoading && !data && (
          <p className="dashboard-state" role="status" aria-live="polite">
            Carregando pendências…
          </p>
        )}

        {error && (
          <div className="dashboard-state error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={retry} disabled={isLoading}>
              {isLoading ? "Carregando…" : "Tentar novamente"}
            </button>
          </div>
        )}

        {data && data.attention.length === 0 && (
          <div className="attention-empty" role="status">
            <BrandIcon name="health" />
            <div>
              <strong>Nenhuma pendência crítica no momento</strong>
              <span>Os principais indicadores estão em ordem.</span>
            </div>
          </div>
        )}

        {data && data.attention.length > 0 && (
          <div className="attention-list">
            {data.attention.map((item) => (
              <article className={`attention-item ${item.severity}`} key={item.id}>
                <BrandIcon name={attentionIcon(item.severity)} />
                <div className="attention-copy">
                  <div className="attention-heading">
                    <strong>{item.title}</strong>
                    {item.count > 0 && (
                      <span className="attention-count" aria-label={`${item.count} ocorrências`}>
                        {numberFormatter.format(item.count)}
                      </span>
                    )}
                  </div>
                  <p>{item.description}</p>
                </div>
                <a href={item.href}>{item.action}</a>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="hub-summary" aria-labelledby="summary-title" aria-busy={isLoading}>
        <h2 id="summary-title" className="visually-hidden">
          Indicadores rápidos
        </h2>

        {isLoading && !data
          ? Array.from({ length: 5 }, (_, index) => (
              <div className="metric-skeleton" key={index} aria-hidden="true" />
            ))
          : metrics.map((metric) => (
              <a
                href={metric.href}
                key={metric.title}
                className={metric.status ? `metric-card ${metric.status}` : "metric-card"}
                aria-label={`${metric.title}: ${formatMetricValue(metric.value)}. ${metric.description}`}
              >
                <BrandIcon name={metric.icon} />
                <strong>{formatMetricValue(metric.value)}</strong>
                <div>
                  <span>{metric.title}</span>
                  <small>{metric.description}</small>
                </div>
              </a>
            ))}
      </section>

      <section className="hub-groups" aria-labelledby="modules-title">
        <h2 id="modules-title" className="visually-hidden">
          Módulos administrativos
        </h2>

        {dashboardGroups.map((group) => (
          <article className="admin-panel" key={group.label}>
            <header>
              <BrandIcon name={group.icon} />
              <div>
                <h2>{group.label}</h2>
                <p>
                  {groupDescriptions[group.label] ??
                    "Administração e acompanhamento da plataforma."}
                </p>
              </div>
            </header>

            {group.items.length > 0 ? (
              <nav aria-label={`Acessos de ${group.label}`}>
                {group.items.map((item) => item.disabled ? (
                  <span className="module-link-disabled" key={`${group.label}:${item.label}`} aria-disabled="true">
                    <BrandIcon name={item.icon} className="module-link-icon" />
                    <div>
                      <strong>{item.label}</strong>
                      {item.description && <small>{item.description}</small>}
                    </div>
                    <span className="module-link-arrow" aria-hidden="true">Em breve</span>
                  </span>
                ) : (
                  <a href={item.href} key={item.href}>
                    <BrandIcon name={item.icon} className="module-link-icon" />
                    <div>
                      <strong>{item.label}</strong>
                      {item.description && <small>{item.description}</small>}
                    </div>
                    <span className="module-link-arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                ))}
              </nav>
            ) : (
              <p className="module-empty">{group.emptyLabel ?? "Módulo em preparação."}</p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
