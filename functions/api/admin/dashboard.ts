import { requirePermission } from "../../_lib/permissions";
import type { AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";

type CountRow = { total?: number };
async function count(env: AppEnv, sql: string, ...values: unknown[]) { const row = await env.DB.prepare(sql).bind(...values).first<CountRow>(); return Number(row?.total || 0); }

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "reports.view"), organizationId = user.organizationId, now = Date.now();
    const [pending, members, rounds, review, stale, noSeason, expiringInvites, privacy, overlaps, awardBacklog, badgeQueue, activeSeason] = await Promise.all([
      count(env, "SELECT COUNT(*) total FROM users WHERE organization_id=?1 AND status='pending'", organizationId),
      count(env, "SELECT COUNT(*) total FROM users WHERE organization_id=?1 AND status='active'", organizationId),
      count(env, "SELECT COUNT(*) total FROM rounds WHERE organization_id=?1", organizationId),
      count(env, "SELECT COUNT(*) total FROM question_bank WHERE organization_id=?1 AND status<>'archived' AND review_status='in_review'", organizationId),
      count(env, "SELECT COUNT(*) total FROM attempts a JOIN users u ON u.id=a.user_id WHERE u.organization_id=?1 AND a.status='in_progress' AND a.started_at<?2", organizationId, now - 86400000),
      count(env, "SELECT COUNT(*) total FROM rounds WHERE organization_id=?1 AND round_type='regular' AND season_id IS NULL AND status<>'cancelled'", organizationId),
      count(env, "SELECT COUNT(*) total FROM invitations WHERE organization_id=?1 AND active=1 AND expires_at IS NOT NULL AND expires_at>?2 AND expires_at<=?3", organizationId, now, now + 7 * 86400000),
      count(env, "SELECT COUNT(*) total FROM privacy_requests pr JOIN users u ON u.id=pr.user_id WHERE u.organization_id=?1 AND pr.status='pending'", organizationId),
      count(env, "SELECT COUNT(*) total FROM rounds a JOIN rounds b ON a.organization_id=b.organization_id AND a.id<b.id AND a.opens_at<b.closes_at AND a.closes_at>b.opens_at WHERE a.organization_id=?1 AND a.status IN ('scheduled','active') AND b.status IN ('scheduled','active')", organizationId),
      count(env, "SELECT COUNT(*) total FROM rounds r LEFT JOIN round_award_processing p ON p.round_id=r.id WHERE r.organization_id=?1 AND p.round_id IS NULL AND r.status NOT IN ('draft','cancelled') AND r.closes_at<=?2", organizationId, now),
      count(env, "SELECT COUNT(DISTINCT requested.entity_id) total FROM audit_logs requested WHERE requested.organization_id=?1 AND requested.action='badge.sync_requested' AND NOT EXISTS(SELECT 1 FROM audit_logs completed WHERE completed.action='badge.sync_completed' AND completed.entity_id=requested.entity_id AND completed.created_at>=requested.created_at)", organizationId),
      env.DB.prepare("SELECT id,title,ends_at endAt FROM seasons WHERE organization_id=?1 AND status='active' ORDER BY ends_at LIMIT 1").bind(organizationId).first<any>(),
    ]);
    const attention: any[] = [];
    const add = (condition: boolean, item: any) => { if (condition) attention.push(item); };
    add(overlaps > 0, { id: "overlaps", severity: "critical", count: overlaps, title: `${overlaps} conflito(s) entre rodadas`, description: "Existem rodadas com períodos sobrepostos.", href: "/admin/rodadas/lista", action: "Revisar rodadas" });
    add(review > 0, { id: "review", severity: "warning", count: review, title: `${review} pergunta(s) aguardando revisão`, description: "Há conteúdo pronto para avaliação editorial.", href: "/admin/perguntas/revisao", action: "Abrir revisão" });
    add(pending > 0, { id: "users", severity: "warning", count: pending, title: `${pending} cadastro(s) pendente(s)`, description: "Novos participantes aguardam uma decisão.", href: "/admin/acessos", action: "Revisar acessos" });
    add(stale > 0, { id: "stale", severity: "warning", count: stale, title: `${stale} tentativa(s) em andamento há mais de 24h`, description: "Confira tentativas que podem precisar de análise.", href: "/admin/diagnostico", action: "Ver diagnóstico" });
    add(noSeason > 0, { id: "seasonless", severity: "critical", count: noSeason, title: `${noSeason} rodada(s) regular(es) sem temporada`, description: "A associação de temporada precisa ser revisada.", href: "/admin/rodadas/lista", action: "Revisar rodadas" });
    add(expiringInvites > 0, { id: "invites", severity: "info", count: expiringInvites, title: `${expiringInvites} convite(s) próximo(s) de expirar`, description: "Os convites vencem nos próximos sete dias.", href: "/admin/convites", action: "Revisar convites" });
    add(privacy > 0, { id: "privacy", severity: "critical", count: privacy, title: `${privacy} solicitação(ões) de privacidade pendente(s)`, description: "Há solicitações que precisam de atendimento.", href: "/admin/privacidade", action: "Atender solicitações" });
    add(awardBacklog > 0, { id: "award-backlog", severity: "critical", count: awardBacklog, title: `${awardBacklog} Jornada(s) aguardando encerramento automático`, description: "A classificação final e as medalhas ainda estão sendo processadas.", href: "/admin/diagnostico", action: "Ver processamento" });
    add(badgeQueue > 0, { id: "badge-queue", severity: "warning", count: badgeQueue, title: `${badgeQueue} sincronização(ões) de medalhas pendente(s)`, description: "O processamento automático continuará em lotes seguros.", href: "/admin/diagnostico", action: "Ver diagnóstico" });
    if (activeSeason?.endAt && Number(activeSeason.endAt) > now && Number(activeSeason.endAt) <= now + 14 * 86400000) add(true, { id: "season-end", severity: "info", count: 1, title: "Temporada próxima do encerramento", description: `${activeSeason.title} termina em breve.`, href: "/admin/temporadas", action: "Abrir temporadas" });
    return json({ metrics: { pending, members, rounds, review, health: overlaps || noSeason || stale || awardBacklog ? "attention" : "healthy" }, attention }, 200, { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
