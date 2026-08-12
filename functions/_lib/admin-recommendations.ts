import type { LibraryHealthInsight } from "./library-health";
import type { HealthStatus } from "./operational-health";
import { EVENT_MAX_REWARDS } from "./platform-events";

export const ADMIN_RECOMMENDATION_THRESHOLDS = Object.freeze({
  upcomingEventDays: 7,
  criticalEventDays: 2,
  highRewardPercentOfMaximum: 80,
});

export type AdminRecommendationSeverity = "CRITICAL" | "ATTENTION" | "INFO";
export type AdminRecommendationDomain = "EVENTS" | "CONTENT" | "PLANNING" | "OPERATIONS";
export type AdminRecommendation = {
  id: string;
  severity: AdminRecommendationSeverity;
  domain: AdminRecommendationDomain;
  title: string;
  reason: string;
  entity: { type: string; id: string | null; label?: string };
  suggestedAction: string;
  href: string;
  calculatedAt: number;
  temporalDistanceMs: number | null;
};

type PlanningEvent = {
  id: string; title: string; status: string; startsAt: number; coverAssetId?: string | null; coverAssetStatus?: string | null;
  rewards?: { participationXp: number; victoryCoins: number; completionBonusXp: number; perfectBonusCoins: number };
  checklist: { ready: boolean; issues: Array<{ code: string; label: string }> };
};
type Input = {
  now: number;
  pendingUsers: number;
  libraryInsights: LibraryHealthInsight[];
  planning: { events: PlanningEvent[]; summary: { noEventsNext14Days: boolean }; editorial: { awaitingReview: number } };
  operationalGroups: Record<string, { checks: Array<{ status: HealthStatus; description: string; value?: number }> }>;
};

const severityOrder: Record<AdminRecommendationSeverity, number> = { CRITICAL: 0, ATTENTION: 1, INFO: 2 };
const librarySeverity: Record<LibraryHealthInsight["severity"], AdminRecommendationSeverity> = { critical: "CRITICAL", attention: "ATTENTION", info: "INFO" };
const day = 86_400_000;

function rewardIsHigh(event: PlanningEvent) {
  const reward = event.rewards;
  if (!reward) return false;
  const threshold = ADMIN_RECOMMENDATION_THRESHOLDS.highRewardPercentOfMaximum / 100;
  return reward.participationXp >= EVENT_MAX_REWARDS.participationXp * threshold
    || reward.victoryCoins >= EVENT_MAX_REWARDS.victoryCoins * threshold
    || reward.completionBonusXp >= EVENT_MAX_REWARDS.completionBonusXp * threshold
    || reward.perfectBonusCoins >= EVENT_MAX_REWARDS.perfectBonusCoins * threshold;
}

export function deriveAdminRecommendations(input: Input): AdminRecommendation[] {
  const recommendations = new Map<string, AdminRecommendation>();
  const add = (item: AdminRecommendation) => {
    const existing = recommendations.get(item.id);
    if (!existing || severityOrder[item.severity] < severityOrder[existing.severity]) recommendations.set(item.id, item);
  };
  const base = (id: string, severity: AdminRecommendationSeverity, domain: AdminRecommendationDomain, title: string, reason: string, entity: AdminRecommendation["entity"], suggestedAction: string, href: string, temporalDistanceMs: number | null = null): AdminRecommendation =>
    ({ id, severity, domain, title, reason, entity, suggestedAction, href, calculatedAt: input.now, temporalDistanceMs });

  for (const insight of input.libraryInsights) add(base(
    `library:${insight.id}`, librarySeverity[insight.severity], "CONTENT", insight.title, insight.description,
    { type: "library", id: insight.gameType }, insight.recommendation, "/admin/conteudo/acervo",
  ));

  for (const event of input.planning.events) {
    const distance = event.startsAt - input.now;
    if (distance < 0 || distance > ADMIN_RECOMMENDATION_THRESHOLDS.upcomingEventDays * day || !["DRAFT", "SCHEDULED"].includes(event.status)) continue;
    const severity: AdminRecommendationSeverity = distance <= ADMIN_RECOMMENDATION_THRESHOLDS.criticalEventDays * day ? "CRITICAL" : "ATTENTION";
    if (!event.checklist.ready) {
      const issues = event.checklist.issues.map(issue => issue.label).join(" ");
      add(base(`event:not-ready:${event.id}`, severity, "EVENTS", `Preparar ${event.title}`, `O Evento começa em ${Math.max(0, Math.ceil(distance / day))} dia(s) e ainda não está pronto. ${issues}`, { type: "platform_event", id: event.id, label: event.title }, "Revisar as etapas indicadas pelo checklist.", "/admin/eventos", distance));
    }
    if (!event.coverAssetId) add(base(`event:cover:${event.id}`, "INFO", "EVENTS", `Considerar uma capa para ${event.title}`, `O Evento começa em ${Math.max(0, Math.ceil(distance / day))} dia(s) e não possui capa. A capa continua opcional.`, { type: "platform_event", id: event.id, label: event.title }, "Avaliar se uma capa ajudará a comunicação do Evento.", "/admin/eventos", distance));
    else if (event.coverAssetStatus && event.coverAssetStatus !== "ACTIVE") add(base(`event:asset:${event.id}`, severity, "EVENTS", `Revisar a capa de ${event.title}`, `O asset associado à capa está ${event.coverAssetStatus}, portanto pode não estar disponível na execução.`, { type: "asset", id: event.coverAssetId, label: event.title }, "Selecionar um asset ativo ou remover a capa.", "/admin/eventos", distance));
    if (rewardIsHigh(event)) add(base(`event:reward:${event.id}`, "ATTENTION", "EVENTS", `Revisar recompensas de ${event.title}`, `Ao menos uma recompensa utiliza 80% ou mais do máximo permitido pelo contrato do Evento.`, { type: "platform_event", id: event.id, label: event.title }, "Confirmar editorialmente se os valores são proporcionais.", "/admin/eventos", distance));
  }

  if (input.planning.summary.noEventsNext14Days) add(base("planning:no-event-14d", "INFO", "PLANNING", "Nenhum Evento nos próximos 14 dias", "O calendário não possui Evento ativo ou agendado nessa janela. Isso é informativo e não representa falha.", { type: "planning_window", id: null }, "Avaliar se o período deve permanecer livre.", "/admin/calendario"));
  if (input.planning.editorial.awaitingReview > 0) add(base("content:awaiting-review", "ATTENTION", "CONTENT", `${input.planning.editorial.awaitingReview} conteúdo(s) aguardam revisão`, "O CMS possui itens no estado editorial IN_REVIEW nesta organização.", { type: "content_review_queue", id: null }, "Abrir a fila e registrar uma decisão editorial humana.", "/admin/conteudo/acervo?status=IN_REVIEW"));
  if (input.pendingUsers > 0) add(base("operations:pending-users", "ATTENTION", "OPERATIONS", `${input.pendingUsers} cadastro(s) aguardam decisão`, "Existem participantes com acesso pendente nesta organização.", { type: "user_access", id: null }, "Revisar os pedidos de acesso.", "/admin/acessos"));

  for (const [groupName, group] of Object.entries(input.operationalGroups)) {
    const failing = group.checks.filter(check => check.status === "CRITICAL" || check.status === "DEGRADED");
    if (!failing.length) continue;
    const severity: AdminRecommendationSeverity = failing.some(check => check.status === "CRITICAL") ? "CRITICAL" : "ATTENTION";
    add(base(`operations:health:${groupName.toLowerCase()}`, severity, "OPERATIONS", `${groupName.replaceAll("_", " ")}: verificar saúde operacional`, failing[0].description, { type: "health_group", id: groupName }, "Abrir o diagnóstico e executar somente a ação operacional indicada.", "/admin/diagnostico"));
  }

  return [...recommendations.values()].sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]
    || (left.temporalDistanceMs ?? Number.POSITIVE_INFINITY) - (right.temporalDistanceMs ?? Number.POSITIVE_INFINITY)
    || left.id.localeCompare(right.id));
}
