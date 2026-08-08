import { requireUser, type AppEnv } from "../../../_lib/auth";
import { generateFreePlaySelection } from "../../../_lib/platform-free-play";
import { json } from "../../../_lib/security";
import { PublicErrorCategory, publicDomainError } from "../../../_lib/operational-observability";

const CLIENT_ERRORS = new Set([
  "unsupported_game",
  "unsupported_filter",
  "invalid_quantity",
  "invalid_idempotency_key",
  "mode_disabled",
  "insufficient_eligible_content",
  "selection_key_conflict",
]);

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "invalid_generation_request" }, 400);
    }
    const game = await generateFreePlaySelection(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    }, body as Record<string, unknown>);
    return json({ game }, 201, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const allowed = Object.fromEntries([...CLIENT_ERRORS].map(code => [code, { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 }]));
    return publicDomainError(error, allowed, { component: "free-play", operation: "generate_selection" });
  }
};
