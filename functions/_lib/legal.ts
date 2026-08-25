export const TERMS_VERSION = "2026-08-24";
export const PRIVACY_VERSION = "2026-08-24";
export const LEGAL_ACCEPTANCE_TYPE = "terms_privacy_age_18_plus_v2";

export async function hasCurrentLegalAcceptance(db: D1Database, userId: string) {
  const row = await db.prepare(`SELECT 1 accepted FROM legal_consents
    WHERE user_id=?1 AND terms_version=?2 AND privacy_version=?3 AND document_type=?4
    LIMIT 1`).bind(userId, TERMS_VERSION, PRIVACY_VERSION, LEGAL_ACCEPTANCE_TYPE).first();
  return Boolean(row);
}
