import type { AppEnv } from "../../../_lib/auth";
import { importOfficialBaseContent } from "../../../_lib/official-base-content-importer";
import { requirePermission } from "../../../_lib/permissions";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user = await requirePermission(request, env, "content.manage");
    const body = await request.json().catch(() => ({})) as { commit?: unknown; confirmation?: unknown };
    const commit = body.commit === true;
    if (commit && body.confirmation !== "IMPORTAR_CONTEUDO_BASE_OFICIAL") {
      return json({ error: "official_base_confirmation_required" }, 400);
    }
    const result = await importOfficialBaseContent(
      env,
      String(user.organizationId),
      String(user.id),
      commit,
    );
    return json({
      dryRun: !commit,
      report: result.report,
      byGame: result.byGame,
    }, 200, { "cache-control": "no-store" });
  } catch (response) {
    if (response instanceof Response) return response;
    const supportId = crypto.randomUUID();
    console.error("official_base_import_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500);
  }
};
