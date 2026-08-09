import { requireUser, type AppEnv } from "../../../_lib/auth";
import { recordDailyOpened } from "../../../_lib/platform-daily-challenge";
import { organizationDayKey } from "../../../_lib/platform-daily-objectives";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const organization = await env.DB.prepare("SELECT timezone FROM organizations WHERE id=?1")
      .bind(user.organizationId).first<{ timezone: string | null }>();
    if (!organization) return json({ error: "organization_unavailable" }, 404);
    const dayKey = organizationDayKey(Date.now(), String(organization.timezone || "America/Sao_Paulo"));
    const result = await recordDailyOpened(env, { organizationId: String(user.organizationId), userId: String(user.id) }, dayKey);
    return json({ ok: true, duplicate: result.duplicate }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: "daily_open_signal_failed" }, 500, { "cache-control": "no-store, private" });
  }
};
