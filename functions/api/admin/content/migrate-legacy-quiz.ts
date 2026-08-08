import type { AppEnv } from "../../../_lib/auth";
import { migrateLegacyQuizArchive } from "../../../_lib/universal-content-importer";
import { requirePermission } from "../../../_lib/permissions";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user = await requirePermission(request, env, "content.manage");
    const body = await request.json().catch(() => ({})) as { commit?: unknown; confirmation?: unknown };
    const commit = body.commit === true;
    if (commit && body.confirmation !== "MIGRAR_ACERVO_QUIZ_PARA_CMS") {
      return json({ error: "migration_confirmation_required" }, 400);
    }
    const result = await migrateLegacyQuizArchive(
      env,
      String(user.organizationId),
      String(user.id),
      commit,
    );
    return json({
      dryRun: !commit,
      report: result.report,
      issues: result.entries.filter(entry => entry.issues.length || entry.duplicateOf).map(entry => ({
        id: entry.model.id,
        issues: entry.issues,
        duplicateOf: entry.duplicateOf,
        targetStatus: entry.targetStatus,
      })),
    }, 200, { "cache-control": "no-store" });
  } catch (response) {
    if (response instanceof Response) return response;
    const supportId = crypto.randomUUID();
    console.error("legacy_quiz_migration_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500);
  }
};
