import type { AppEnv } from "../../../_lib/auth";
import { loadQuizCatalogDiagnostics } from "../../../_lib/quiz-catalog-diagnostics";
import { requirePermission } from "../../../_lib/permissions";
import { json } from "../../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user = await requirePermission(request, env, "questions.edit");
    return json(
      await loadQuizCatalogDiagnostics(env, String(user.organizationId), String(user.id)),
      200,
      { "cache-control": "no-store, private" },
    );
  } catch (response) {
    if (response instanceof Response) return response;
    const supportId = crypto.randomUUID();
    console.error("quiz_catalog_diagnostics_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500, { "cache-control": "no-store, private" });
  }
};
