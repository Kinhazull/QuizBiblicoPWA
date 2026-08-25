import { requireUser, type AppEnv } from "../../_lib/auth";
import { enforceRateLimit, requestFingerprint } from "../../_lib/abuse";
import { hasCurrentLegalAcceptance, LEGAL_ACCEPTANCE_TYPE, PRIVACY_VERSION, TERMS_VERSION } from "../../_lib/legal";
import { json } from "../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const user: any = await requireUser(request, env, true);
  const body: any = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid_request" }, 400);
  if (body.adultConfirmed !== true) return json({ error: "adult_confirmation_required" }, 400);
  if (body.legalAccepted !== true || body.termsVersion !== TERMS_VERSION || body.privacyVersion !== PRIVACY_VERSION) return json({ error: "legal_consent_required" }, 400);
  if (await hasCurrentLegalAcceptance(env.DB, String(user.id))) return json({ ok: true, alreadyAccepted: true });
  const fingerprint = await requestFingerprint(request);
  const retry = await enforceRateLimit(env, `legal-acceptance:${user.id}:${fingerprint}`, 6, 15 * 60 * 1000);
  if (retry) return json({ error: "too_many_requests", retryAfter: retry }, 429, { "retry-after": String(retry) });
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO legal_consents
    (id,user_id,terms_version,privacy_version,accepted_at,organization_id,document_type,ip_hash,user_agent)
    SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9
    WHERE NOT EXISTS(SELECT 1 FROM legal_consents WHERE user_id=?2 AND terms_version=?3 AND privacy_version=?4 AND document_type=?7)`)
    .bind(crypto.randomUUID(), user.id, TERMS_VERSION, PRIVACY_VERSION, now, user.organizationId, LEGAL_ACCEPTANCE_TYPE, fingerprint, String(request.headers.get("user-agent") || "").slice(0, 300)).run();
  return json({ ok: true });
};
