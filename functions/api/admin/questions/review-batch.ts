import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { json } from "../../../_lib/security";

const transitions: Record<string, { permission: "questions.edit" | "questions.review"; from: string[]; to: string }> = {
  submit: { permission: "questions.edit", from: ["draft", "changes_requested"], to: "in_review" },
  approve: { permission: "questions.review", from: ["in_review"], to: "approved" },
  approve_reviewed_import: { permission: "questions.review", from: ["draft", "changes_requested", "in_review"], to: "approved" },
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const body: any = await request.json(), action = String(body.action || ""), transition = transitions[action];
    if (!transition) return json({ error: "invalid_action" }, 400);
    const user: any = await requirePermission(request, env, transition.permission);
    const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))].slice(0, 100);
    if (!ids.length) return json({ error: "invalid_selection" }, 400);
    const marks = ids.map((_, index) => `?${index + 2}`).join(","), rows = await env.DB.prepare(`SELECT id,prompt,review_status reviewStatus FROM question_bank WHERE organization_id=?1 AND status<>'archived' AND id IN (${marks})`).bind(user.organizationId, ...ids).all();
    const eligible = (rows.results as any[]).filter(row => transition.from.includes(row.reviewStatus));
    if (!eligible.length || eligible.length !== ids.length) return json({ error: "invalid_transition", eligible: eligible.length, selected: ids.length }, 409);
    const eligibleMarks = eligible.map((_, index) => `?${index + 4}`).join(","), now = Date.now();
    await env.DB.batch([
      env.DB.prepare(`UPDATE question_bank SET review_status=?1,updated_by=?2,updated_at=?3 WHERE id IN (${eligibleMarks}) AND organization_id=?${eligible.length + 4}`).bind(transition.to, user.id, now, ...eligible.map(row => row.id), user.organizationId),
      env.DB.prepare(`INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,details_json,created_at) VALUES(?1,?2,?3,'questions.review.batch','question_bank',?4,?5)`).bind(crypto.randomUUID(), user.organizationId, user.id, JSON.stringify({ action, from: transition.from, to: transition.to, count: eligible.length, ids: eligible.map(row => row.id) }), now),
    ]);
    return json({ ok: true, count: eligible.length, reviewStatus: transition.to });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
