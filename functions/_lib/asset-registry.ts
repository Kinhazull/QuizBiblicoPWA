import type { AppEnv } from "./auth";

export const ASSET_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const ASSET_MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(["IMAGE", "ICON", "BANNER"]);
const STATUSES = new Set(["DRAFT", "ACTIVE", "ARCHIVED"]);
const ROLES = new Set(["PRIMARY", "THUMBNAIL", "CLUE", "PAIR_A", "PAIR_B", "BACKGROUND"]);
const text = (value: unknown, max: number) => typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : "";

export function validateAssetInput(input: unknown) {
  const body = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const sourceUrl = text(body.sourceUrl, 2048);
  let url: URL | null = null;
  try { url = new URL(sourceUrl); } catch { url = null; }
  const mimeType = text(body.mimeType, 80);
  const value = {
    type: text(body.type, 20), title: text(body.title, 160), altText: text(body.altText, 300), sourceUrl,
    source: text(body.source, 300) || null, attribution: text(body.attribution, 500) || null,
    license: text(body.license, 160) || null, width: Number(body.width), height: Number(body.height),
    byteSize: body.byteSize == null ? null : Number(body.byteSize), mimeType,
    status: text(body.status, 20) || "DRAFT",
  };
  const errors: string[] = [];
  if (!TYPES.has(value.type)) errors.push("invalid_type");
  if (!value.title) errors.push("title_required");
  if (!value.altText) errors.push("alt_text_required");
  if (!url || url.protocol !== "https:") errors.push("secure_https_url_required");
  if (!(ASSET_MIME_TYPES as readonly string[]).includes(mimeType)) errors.push("unsupported_mime_type");
  if (!Number.isInteger(value.width) || value.width < 1 || value.width > 12000) errors.push("invalid_width");
  if (!Number.isInteger(value.height) || value.height < 1 || value.height > 12000) errors.push("invalid_height");
  if (value.byteSize !== null && (!Number.isInteger(value.byteSize) || value.byteSize < 1 || value.byteSize > ASSET_MAX_BYTES)) errors.push("invalid_byte_size");
  if (!STATUSES.has(value.status)) errors.push("invalid_status");
  if (value.status === "ACTIVE" && (!value.source || !value.license)) errors.push("active_asset_requires_source_and_license");
  return errors.length ? { ok: false as const, errors } : { ok: true as const, value };
}

export async function listAssets(env: AppEnv, organizationId: string, status?: string | null) {
  const rows = status && STATUSES.has(status)
    ? await env.DB.prepare("SELECT * FROM asset_registry WHERE organization_id=?1 AND status=?2 ORDER BY updated_at DESC,id").bind(organizationId, status).all()
    : await env.DB.prepare("SELECT * FROM asset_registry WHERE organization_id=?1 ORDER BY updated_at DESC,id").bind(organizationId).all();
  return rows.results;
}

export async function createAsset(env: AppEnv, organizationId: string, actorId: string, input: unknown) {
  const validation = validateAssetInput(input);
  if (!validation.ok) return validation;
  const id = crypto.randomUUID(); const now = Date.now(); const asset = validation.value;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO asset_registry(id,organization_id,type,title,alt_text,source_url,source,attribution,license,
      width,height,byte_size,mime_type,status,created_by,created_at,updated_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16)`)
      .bind(id, organizationId, asset.type, asset.title, asset.altText, asset.sourceUrl, asset.source, asset.attribution,
        asset.license, asset.width, asset.height, asset.byteSize, asset.mimeType, asset.status, actorId, now),
    env.DB.prepare(`INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
      VALUES(?1,?2,?3,'asset.created','asset',?4,?5,?6)`).bind(crypto.randomUUID(), organizationId, actorId, id,
        JSON.stringify({ type: asset.type, status: asset.status, mimeType: asset.mimeType }), now),
  ]);
  return { ok: true as const, id };
}

export async function linkContentAsset(env: AppEnv, organizationId: string, actorId: string, contentId: string, input: unknown) {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const assetId = text(body.assetId, 100); const role = text(body.role, 30); const position = Number(body.position ?? 0);
  if (!assetId || !ROLES.has(role) || !Number.isInteger(position) || position < 0) return { ok: false as const, code: "invalid_link" as const };
  const owned = await env.DB.prepare(`SELECT c.version FROM content_items c JOIN asset_registry a ON a.id=?1 AND a.organization_id=c.organization_id
    WHERE c.id=?2 AND c.organization_id=?3`).bind(assetId, contentId, organizationId).first<{ version: number }>();
  if (!owned) return { ok: false as const, code: "not_found" as const };
  await env.DB.prepare(`INSERT OR IGNORE INTO content_assets(organization_id,content_id,content_version,asset_id,role,position,created_by,created_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`).bind(organizationId, contentId, Number(owned.version), assetId, role, position, actorId, Date.now()).run();
  return { ok: true as const };
}
