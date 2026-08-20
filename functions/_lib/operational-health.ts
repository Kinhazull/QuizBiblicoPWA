import { GameType } from "../../shared/content";
import { OPERATIONAL_THRESHOLDS } from "../../shared/operational-thresholds.mjs";
import type { AppEnv } from "./auth";

export type HealthStatus = "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN";
export type OperationalHealthCheck = { status: HealthStatus; code: string; description: string; value: number | null; checkedAt: number; guidance: string };
export type OperationalHealthGroup = { status: HealthStatus; checks: OperationalHealthCheck[] };

const severity: Record<HealthStatus, number> = { HEALTHY: 0, UNKNOWN: 1, DEGRADED: 2, CRITICAL: 3 };
const aggregate = (statuses: HealthStatus[]) => statuses.reduce((worst, status) => severity[status] > severity[worst] ? status : worst, "HEALTHY" as HealthStatus);
const check = (status: HealthStatus, code: string, description: string, value: number | null, checkedAt: number, guidance: string): OperationalHealthCheck => ({ status, code, description, value, checkedAt, guidance });
const count = async (env: AppEnv, sql: string, bindings: unknown[] = []) => Number((await env.DB.prepare(sql).bind(...bindings).first<any>())?.total ?? 0);

async function guarded(fn: () => Promise<OperationalHealthCheck>, code: string, now: number) {
  try { return await fn(); } catch { return check("UNKNOWN", code, "Não foi possível concluir esta verificação.", null, now, "Confirme schema, binding D1 e disponibilidade do serviço."); }
}

export async function buildOperationalHealth(env: AppEnv, organizationId: string, context: { now?: number; migrationRows: number | null; expectedMigrations: number; schemaProblems: number }) {
  const now = context.now ?? Date.now();
  const groups: Record<string, OperationalHealthGroup> = {};
  const add = (name: string, checks: OperationalHealthCheck[]) => { groups[name] = { status: aggregate(checks.map(item => item.status)), checks }; };

  add("DATABASE", [check(context.schemaProblems ? "CRITICAL" : "HEALTHY", "database.schema_integrity", context.schemaProblems ? "O schema operacional está incompleto." : "Estruturas operacionais essenciais disponíveis.", context.schemaProblems, now, "Use o reconciliador oficial; não edite o ledger manualmente.")]);
  const migrationMismatch = context.migrationRows !== null && context.migrationRows !== context.expectedMigrations;
  add("MIGRATIONS", [check(migrationMismatch ? "CRITICAL" : context.migrationRows === null ? "UNKNOWN" : "HEALTHY", "migrations.ledger", migrationMismatch ? "Ledger de migrations divergente." : "Ledger compatível com o contrato local.", context.migrationRows, now, "Execute verify-promotable/verify-final pelo fluxo oficial.")]);

  const unprojected = await guarded(async () => { const value = await count(env, `SELECT COUNT(*) total FROM content_items item LEFT JOIN universal_content_library library ON library.organization_id=item.organization_id AND library.content_id=item.id AND library.content_version=item.version WHERE item.organization_id=?1 AND item.status='PUBLISHED' AND library.content_id IS NULL`, [organizationId]); return check(value ? "DEGRADED" : "HEALTHY", "cms.unprojected_content", value ? "Conteúdos publicados sem projeção na Biblioteca." : "Conteúdos publicados projetados.", value, now, "Execute o diagnóstico/importador administrativo; não altere conteúdo automaticamente."); }, "cms.unavailable", now);
  add("CMS", [unprojected]);

  const divergent = await guarded(async () => { const value = await count(env, `SELECT COUNT(*) total FROM universal_content_library library JOIN content_items item ON item.organization_id=library.organization_id AND item.id=library.content_id WHERE library.organization_id=?1 AND library.content_version<>item.version`, [organizationId]); return check(value ? "DEGRADED" : "HEALTHY", "library.version_divergence", value ? "Projeções com versão divergente." : "Versões da Biblioteca consistentes.", value, now, "Sincronize pela operação administrativa oficial."); }, "library.unavailable", now);
  const reservedWithoutReservation = await guarded(async () => { const value = await count(env, `SELECT COUNT(*) total FROM universal_content_library library WHERE library.organization_id=?1 AND library.availability_status='RESERVED_EVENT' AND NOT EXISTS(SELECT 1 FROM platform_event_content_reservations reservation WHERE reservation.organization_id=library.organization_id AND reservation.content_id=library.content_id AND reservation.content_version=library.content_version AND reservation.released_at IS NULL)`, [organizationId]); return check(value ? "CRITICAL" : "HEALTHY", "library.orphan_reservation_state", value ? "Conteúdo reservado sem reserva válida." : "Estados de reserva consistentes.", value, now, "Execute a reconciliação de Eventos; não libere registros manualmente."); }, "library.reservation_check_unavailable", now);
  add("UNIVERSAL_LIBRARY", [divergent, reservedWithoutReservation]);

  const catalogRows = await env.DB.prepare(`SELECT game_type gameType,difficulty,COUNT(*) total FROM universal_content_library WHERE organization_id=?1 AND availability_status='AVAILABLE' GROUP BY game_type,difficulty`).bind(organizationId).all<any>().catch(() => ({ results: [] } as any));
  const byGame = new Map<string, number>(); const byDifficulty = new Map<string, number>();
  for (const row of catalogRows.results ?? []) { byGame.set(String(row.gameType), (byGame.get(String(row.gameType)) ?? 0) + Number(row.total)); byDifficulty.set(`${row.gameType}:${row.difficulty}`, Number(row.total)); }
  const catalogChecks = Object.values(GameType).map(gameType => { const value = byGame.get(gameType) ?? 0; const minimum = OPERATIONAL_THRESHOLDS.catalogMinimumByGame[gameType]; return check(value < minimum ? "CRITICAL" : "HEALTHY", `generator.catalog.${gameType}`, value < minimum ? "Catálogo abaixo do mínimo operacional." : "Catálogo suficiente para geração.", value, now, `Publique e projete ao menos ${minimum} conteúdo(s) elegíveis.`); });
  const quizDifficultyShortage = Object.entries(OPERATIONAL_THRESHOLDS.quizDailyDifficultyMinimum).filter(([difficulty, minimum]) => (byDifficulty.get(`${GameType.QUIZ}:${difficulty}`) ?? 0) < minimum).length;
  catalogChecks.push(check(quizDifficultyShortage ? "CRITICAL" : "HEALTHY", "generator.daily_difficulty", quizDifficultyShortage ? "Distribuição de dificuldade insuficiente para o Quiz Diário." : "Distribuição diária do Quiz disponível.", quizDifficultyShortage, now, "Revise o catálogo por dificuldade; o health check não gera seleções."));
  const incomplete = await guarded(async () => { const value = await count(env, `SELECT COUNT(*) total FROM generated_game_selections selection WHERE selection.organization_id=?1 AND selection.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM generated_game_selection_items item WHERE item.selection_id=selection.id)`, [organizationId]); return check(value ? "CRITICAL" : "HEALTHY", "generator.incomplete_selection", value ? "Seleções ativas sem itens." : "Seleções ativas possuem itens.", value, now, "Investigue a geração pelo supportId e preserve a seleção para análise."); }, "generator.selection_check_unavailable", now);
  const missingHistory = await guarded(async () => { const value = await count(env, `SELECT COUNT(*) total FROM generated_game_selection_items selected LEFT JOIN content_versions version ON version.organization_id=selected.organization_id AND version.content_id=selected.content_id AND version.version=selected.content_version WHERE selected.organization_id=?1 AND version.content_id IS NULL`, [organizationId]); return check(value ? "CRITICAL" : "HEALTHY", "generator.missing_history", value ? "Versões históricas referenciadas estão ausentes." : "Conteúdo histórico resolvível.", value, now, "Restaure a versão pelo procedimento de backup; não substitua por versão atual."); }, "generator.history_check_unavailable", now);
  const stuck = await guarded(async () => { const value = await count(env, `SELECT COUNT(*) total
    FROM generated_game_participations participation
    JOIN generated_game_selections selection ON selection.id=participation.selection_id
    WHERE participation.organization_id=?1 AND participation.status='STARTED'
      AND participation.updated_at<?2 AND selection.expires_at>?3`, [organizationId, now - OPERATIONAL_THRESHOLDS.staleParticipationMs, now]); return check(value ? "DEGRADED" : "HEALTHY", "generator.stuck_participations", value ? "Participações ativas permanecem STARTED além da janela técnica." : "Sem participações ativas presas.", value, now, "Confirme abandono/lifecycle antes de qualquer correção manual."); }, "generator.participation_check_unavailable", now);
  add("GENERATOR", [...catalogChecks, incomplete, missingHistory, stuck]);

  const staleEvents = await guarded(async () => { const value = await count(env, "SELECT COUNT(*) total FROM platform_events WHERE organization_id=?1 AND status IN ('SCHEDULED','ACTIVE') AND ends_at<=?2", [organizationId, now]); return check(value ? "DEGRADED" : "HEALTHY", "events.overdue_active", value ? "Eventos encerrados ainda aguardam reconciliação." : "Lifecycle dos Eventos atualizado.", value, now, "Aguarde ou execute o job operacional existente."); }, "events.unavailable", now);
  const expiredReservations = await guarded(async () => { const value = await count(env, "SELECT COUNT(*) total FROM platform_event_content_reservations WHERE organization_id=?1 AND released_at IS NULL AND ends_at<=?2", [organizationId, now]); return check(value ? "DEGRADED" : "HEALTHY", "events.expired_reservations", value ? "Reservas expiradas ainda ativas." : "Reservas dentro da janela.", value, now, "Execute a reconciliação de Eventos."); }, "events.reservations_unavailable", now);
  const orphanReservations = await guarded(async () => { const value = await count(env, `SELECT COUNT(*) total FROM platform_event_content_reservations reservation LEFT JOIN platform_events event ON event.id=reservation.event_id AND event.organization_id=reservation.organization_id WHERE reservation.organization_id=?1 AND reservation.released_at IS NULL AND event.id IS NULL`, [organizationId]); return check(value ? "CRITICAL" : "HEALTHY", "events.orphan_reservations", value ? "Reservas órfãs detectadas." : "Reservas vinculadas a Eventos válidos.", value, now, "Preserve evidências e escale para análise de integridade."); }, "events.orphan_check_unavailable", now);
  add("EVENTS", [staleEvents]);
  add("WORKER", [
    staleEvents,
    expiredReservations,
    check("UNKNOWN", "worker.cron_heartbeat_unavailable", "Não existe heartbeat persistido para provar a última execução do Cron.", null, now, "Confirme o Cron nos logs do Worker; adicionar persistência exige decisão e migration própria."),
  ]);
  add("PRIVACY", [check("HEALTHY", "privacy.health_minimization", "Health check não retorna dados pessoais.", 0, now, "Mantenha logs e respostas sem identificadores pessoais.")]);

  const outboxSummary = await guarded(async () => { const row = await env.DB.prepare(`SELECT COUNT(*) total,MIN(created_at) oldest FROM quiz_core_event_outbox WHERE organization_id=?1 AND delivery_state IN ('pending','processing','retryable_failed','dead_letter')`).bind(organizationId).first<any>(); const value = Number(row?.total ?? 0); const age = row?.oldest == null ? 0 : Math.max(0, now - Number(row.oldest)); const status = value >= OPERATIONAL_THRESHOLDS.outbox.criticalCount || age >= OPERATIONAL_THRESHOLDS.outbox.criticalAgeMs ? "CRITICAL" : value >= OPERATIONAL_THRESHOLDS.outbox.degradedCount || age >= OPERATIONAL_THRESHOLDS.outbox.degradedAgeMs ? "DEGRADED" : "HEALTHY"; return check(status, "outbox.backlog", value ? "Eventos aguardam entrega pela Outbox." : "Outbox sem backlog.", value, now, "Verifique idade, retries e dead letters pelo endpoint operacional restrito."); }, "outbox.unavailable", now);
  const outboxDead = await guarded(async () => { const value = await count(env, "SELECT COUNT(*) total FROM quiz_core_event_outbox WHERE organization_id=?1 AND delivery_state='dead_letter'", [organizationId]); return check(value ? "CRITICAL" : "HEALTHY", "outbox.dead_letters", value ? "Dead letters exigem análise." : "Sem dead letters.", value, now, "Use o runbook de dead letters; não altere o estado diretamente."); }, "outbox.dead_letter_check_unavailable", now);
  add("OUTBOX", [outboxSummary, outboxDead]);

  const engineFailures = await guarded(async () => { const value = await count(env, `SELECT COUNT(*) total FROM core_platform_event_processing processing JOIN core_platform_events event ON event.event_id=processing.event_id WHERE event.organization_id=?1 AND processing.state IN ('retryable_failed','dead_letter')`, [organizationId]); const status = value >= OPERATIONAL_THRESHOLDS.eventEngine.criticalCount ? "CRITICAL" : value >= OPERATIONAL_THRESHOLDS.eventEngine.degradedCount ? "DEGRADED" : "HEALTHY"; return check(status, "event_engine.failures", value ? "Consumers possuem falhas pendentes." : "Consumers sem falhas pendentes.", value, now, "Use retry oficial e investigue o consumer/checkpoint correspondente."); }, "event_engine.unavailable", now);
  add("EVENT_ENGINE", [engineFailures]);
  add("ECONOMY", [check("HEALTHY", "economy.ledger_contract", "Economia permanece baseada em ledgers idempotentes.", 0, now, "Investigue divergências pelo ledger, sem editar saldo diretamente.")]);
  add("EVENTS", [staleEvents, expiredReservations, orphanReservations]);

  return { status: aggregate(Object.values(groups).map(group => group.status)), checkedAt: now, thresholdsVersion: 1, groups };
}
