import { requirePermission } from "../../_lib/permissions";
import type { AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";
import { getPlatformAnalytics } from "../../_lib/platform-analytics";
import { buildOperationalHealth } from "../../_lib/operational-health";
import { EXPECTED_MIGRATION_COUNT } from "../../../shared/operational-schema-contract.mjs";
import { getPlatformPlanningCalendar } from "../../_lib/platform-planning";
import { deriveAdminRecommendations } from "../../_lib/admin-recommendations";

type CountRow = { total?: number };

async function count(env: AppEnv, sql: string, ...values: unknown[]) {
  const row = await env.DB.prepare(sql).bind(...values).first<CountRow>();
  return Number(row?.total || 0);
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "reports.view");
    const organizationId = String(user.organizationId);
    const now = Date.now();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const migrationRows = await count(env, "SELECT COUNT(*) total FROM d1_migrations").catch(() => 0);
    const [analytics, operational, planning, pending, members, needsReview, contentSummary, reservations, activeEvent, nextEvent, recent] = await Promise.all([
      getPlatformAnalytics(env, organizationId, { key: "today", from: startOfToday.getTime(), to: now }),
      buildOperationalHealth(env, organizationId, {
        now,
        migrationRows,
        expectedMigrations: EXPECTED_MIGRATION_COUNT,
        schemaProblems: 0,
      }),
      getPlatformPlanningCalendar(env, organizationId, { from: now, to: now + 14 * 86_400_000, now }),
      count(env, "SELECT COUNT(*) total FROM users WHERE organization_id=?1 AND status='pending'", organizationId),
      count(env, "SELECT COUNT(*) total FROM users WHERE organization_id=?1 AND status='active'", organizationId),
      count(env, "SELECT COUNT(*) total FROM content_items WHERE organization_id=?1 AND editorial_status='IN_REVIEW'", organizationId),
      env.DB.prepare(`SELECT
        SUM(CASE WHEN item.status='PUBLISHED' THEN 1 ELSE 0 END) published,
        SUM(CASE WHEN library.availability_status='AVAILABLE' THEN 1 ELSE 0 END) available,
        SUM(CASE WHEN item.status='PUBLISHED' AND library.content_id IS NULL THEN 1 ELSE 0 END) unprojected
        FROM content_items item LEFT JOIN universal_content_library library
          ON library.organization_id=item.organization_id AND library.content_id=item.id AND library.content_version=item.version
        WHERE item.organization_id=?1`).bind(organizationId).first<any>(),
      env.DB.prepare(`SELECT
        SUM(CASE WHEN released_at IS NULL AND ends_at>?2 THEN 1 ELSE 0 END) active,
        SUM(CASE WHEN released_at IS NULL AND ends_at<=?2 THEN 1 ELSE 0 END) expired
        FROM platform_event_content_reservations WHERE organization_id=?1`).bind(organizationId, now).first<any>(),
      env.DB.prepare(`SELECT id,title,status,starts_at startsAt,ends_at endsAt
        FROM platform_events WHERE organization_id=?1 AND status='ACTIVE' AND starts_at<=?2 AND ends_at>?2
        ORDER BY starts_at LIMIT 1`).bind(organizationId, now).first<any>(),
      env.DB.prepare(`SELECT id,title,status,starts_at startsAt,ends_at endsAt
        FROM platform_events WHERE organization_id=?1 AND status='SCHEDULED' AND starts_at>?2
        ORDER BY starts_at LIMIT 1`).bind(organizationId, now).first<any>(),
      env.DB.prepare(`SELECT action,entity_type entityType,created_at createdAt
        FROM audit_logs WHERE organization_id=?1 ORDER BY created_at DESC LIMIT 8`).bind(organizationId).all<any>(),
    ]);

    const recommendations = deriveAdminRecommendations({ now, pendingUsers: pending, libraryInsights: planning.libraryHealth.insights, planning, operationalGroups: operational.groups });

    const content = {
      needsReview,
      published: Number(contentSummary?.published || 0),
      available: Number(contentSummary?.available || 0),
      unprojected: Number(contentSummary?.unprojected || 0),
      libraryHealth: { total: planning.libraryHealth.total, counts: planning.libraryHealth.counts },
    };
    const reservationSummary = { active: Number(reservations?.active || 0), expired: Number(reservations?.expired || 0) };
    const health = { status: operational.status, checkedAt: operational.checkedAt };

    return json({
      metrics: {
        pending,
        members,
        rounds: analytics.overview.started,
        review: needsReview,
        health: operational.status === "HEALTHY" ? "healthy" : "attention",
      },
      health,
      usage: {
        activeUsers: analytics.overview.players,
        started: analytics.overview.started,
        completed: analytics.overview.completed,
        completionRate: analytics.overview.completionRate,
      },
      events: { active: activeEvent || null, next: nextEvent || null },
      content,
      reservations: reservationSummary,
      recent: (recent.results || []).map(row => ({ action: String(row.action), entityType: String(row.entityType), createdAt: Number(row.createdAt) })),
      recommendations,
    }, 200, {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
