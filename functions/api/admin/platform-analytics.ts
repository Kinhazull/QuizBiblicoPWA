import type { AppEnv } from "../../_lib/auth";
import { getPlatformAnalytics, parseAnalyticsPeriod } from "../../_lib/platform-analytics";
import { PublicErrorCategory, publicDomainError } from "../../_lib/operational-observability";
import { requirePermission } from "../../_lib/permissions";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "analytics.view");
    const organization = await env.DB.prepare("SELECT timezone FROM organizations WHERE id=?1")
      .bind(user.organizationId).first<{ timezone: string | null }>();
    const period = parseAnalyticsPeriod(new URL(request.url), Date.now(), String(organization?.timezone || "America/Sao_Paulo"));
    const result = await getPlatformAnalytics(env, user.organizationId, period);
    return json(result, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    return publicDomainError(error, {
      analytics_invalid_period: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400, message: "O período informado é inválido ou excede 90 dias." },
    }, { component: "platform-analytics", operation: "analytics_read" });
  }
};
