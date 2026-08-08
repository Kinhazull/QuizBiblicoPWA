import type { AppEnv } from "../../../../_lib/auth";
import { addReviewComment, listReviewComments } from "../../../../_lib/editorial-governance";
import { requireAnyPermission, requirePermission } from "../../../../_lib/permissions";
import { json } from "../../../../_lib/security";

type Context = { request: Request; env: AppEnv; params: { id: string } };
export const onRequestGet = async ({ request, env, params }: Context) => {
  try {
    const user = await requireAnyPermission(request, env, ["content.manage", "content.review"]);
    const comments = await listReviewComments(env, String(user.organizationId), params.id);
    return comments ? json({ comments }, 200, { "cache-control": "no-store" }) : json({ error: "not_found" }, 404);
  } catch (error) { if (error instanceof Response) return error; throw error; }
};
export const onRequestPost = async ({ request, env, params }: Context) => {
  try {
    const user = await requirePermission(request, env, "content.review");
    const body = await request.json() as { body?: unknown };
    const result = await addReviewComment(env, String(user.organizationId), String(user.id), params.id, body.body);
    if (!result.ok && result.code === "not_found") return json({ error: "not_found" }, 404);
    if (!result.ok) return json({ error: "invalid_comment" }, 422);
    return json({ ok: true }, 201);
  } catch (error) { if (error instanceof Response) return error; if (error instanceof SyntaxError) return json({ error: "invalid_json" }, 400); throw error; }
};
