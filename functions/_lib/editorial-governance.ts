import { ContentStatus, canTransitionContentStatus, validateContent } from "../../shared/content";
import type { AppEnv } from "./auth";
import { prepareDraftContentLibrarySync, preparePublishedContentLibrarySync } from "./universal-content-library";
import { findUniversalContent } from "./universal-content-store";

export type EditorialStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

const cleanComment = (value: unknown) => typeof value === "string"
  ? value.normalize("NFKC").trim().slice(0, 2000) || null
  : null;
const parseObject = (value: unknown) => {
  try { const parsed = JSON.parse(String(value ?? "{}")); return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}; }
  catch { return {}; }
};

export async function transitionEditorialContent(
  env: AppEnv,
  organizationId: string,
  actorId: string,
  contentId: string,
  target: EditorialStatus,
  knownVersion: unknown,
  comment?: unknown,
) {
  const current = await findUniversalContent(env, organizationId, contentId);
  if (!current) return { ok: false as const, code: "not_found" as const };
  if (Number(knownVersion) !== current.version) return { ok: false as const, code: "conflict" as const, currentVersion: current.version };
  if (current.status === target) return { ok: true as const, content: current, unchanged: true as const };
  if (!canTransitionContentStatus(current.status, target)) return { ok: false as const, code: "invalid_transition" as const };

  const normalizedComment = cleanComment(comment);
  if (current.status === ContentStatus.IN_REVIEW && target === ContentStatus.DRAFT && !normalizedComment) {
    return { ok: false as const, code: "comment_required" as const };
  }
  const nextVersion = current.version + 1;
  const now = Math.max(Date.now(), current.updatedAt + 1);
  const validation = validateContent(current.gameType, {
    id: current.id, gameType: current.gameType, category: current.category, tags: current.tags,
    difficulty: current.difficulty, biblicalReference: current.biblicalReference, status: target,
    authorId: current.authorId, reviewerId: target === ContentStatus.PUBLISHED ? actorId : current.reviewerId,
    createdAt: current.createdAt, updatedAt: now, version: nextVersion, internalNotes: current.internalNotes,
  }, current.payload);
  if (!validation.valid || !validation.normalizedValue) return { ok: false as const, code: "invalid_content" as const, errors: validation.errors };

  const publicationStatus = target === ContentStatus.PUBLISHED ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
  const libraryStatement = target === ContentStatus.PUBLISHED
    ? preparePublishedContentLibrarySync(env, current, nextVersion, now)
    : prepareDraftContentLibrarySync(env, current, nextVersion, now);
  const metadata = {
    id: current.id, gameType: current.gameType, category: current.category, tags: current.tags,
    difficulty: current.difficulty, biblicalReference: current.biblicalReference, status: target,
    authorId: current.authorId, reviewerId: target === ContentStatus.PUBLISHED ? actorId : current.reviewerId,
    createdAt: current.createdAt, updatedAt: now, version: nextVersion, internalNotes: current.internalNotes,
    reference: current.reference, templateId: current.templateId,
  };
  const auditAction = target === ContentStatus.IN_REVIEW ? "content.submitted_for_review"
    : target === ContentStatus.PUBLISHED ? "content.review_approved"
      : target === ContentStatus.ARCHIVED ? "content.archived"
        : current.status === ContentStatus.ARCHIVED ? "content.restored_to_draft" : "content.review_changes_requested";
  await env.DB.batch([
    env.DB.prepare(`UPDATE content_items SET status=?1,editorial_status=?2,version=?3,updated_at=?4,
      submitted_by=CASE WHEN ?2='IN_REVIEW' THEN ?5 ELSE submitted_by END,
      submitted_at=CASE WHEN ?2='IN_REVIEW' THEN ?4 ELSE submitted_at END,
      reviewed_by=CASE WHEN ?6='IN_REVIEW' AND ?2 IN ('DRAFT','PUBLISHED') THEN ?5 ELSE reviewed_by END,
      reviewed_at=CASE WHEN ?6='IN_REVIEW' AND ?2 IN ('DRAFT','PUBLISHED') THEN ?4 ELSE reviewed_at END,
      review_decision=CASE WHEN ?2='PUBLISHED' THEN 'APPROVED' WHEN ?6='IN_REVIEW' AND ?2='DRAFT' THEN 'CHANGES_REQUESTED' ELSE review_decision END,
      review_comment=COALESCE(?7,review_comment)
      WHERE id=?8 AND organization_id=?9 AND version=?10 AND editorial_status=?6`)
      .bind(publicationStatus, target, nextVersion, now, actorId, current.status, normalizedComment,
        contentId, organizationId, current.version),
    env.DB.prepare(`INSERT INTO content_versions(id,content_id,organization_id,version,metadata_json,payload_json,changed_by,change_summary,created_at)
      SELECT ?1,?2,?3,?4,?5,payload_json,?6,?7,?8 FROM content_items
      WHERE id=?2 AND organization_id=?3 AND version=?4 AND editorial_status=?9`)
      .bind(crypto.randomUUID(), contentId, organizationId, nextVersion, JSON.stringify(metadata), actorId,
        `${current.status} -> ${target}`, now, target),
    env.DB.prepare(`INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
      SELECT ?1,?2,?3,?4,'content_item',?5,?6,?7 WHERE EXISTS(
        SELECT 1 FROM content_items WHERE id=?5 AND organization_id=?2 AND version=?8 AND editorial_status=?9)`)
      .bind(crypto.randomUUID(), organizationId, actorId, auditAction, contentId,
        JSON.stringify({ fromStatus: current.status, toStatus: target, version: nextVersion }), now, nextVersion, target),
    ...(normalizedComment ? [env.DB.prepare(`INSERT INTO content_review_comments(
      id,organization_id,content_id,content_version,author_id,body,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE EXISTS(
        SELECT 1 FROM content_items WHERE id=?3 AND organization_id=?2 AND version=?4)`)
      .bind(crypto.randomUUID(), organizationId, contentId, nextVersion, actorId, normalizedComment, now)] : []),
    libraryStatement,
  ]);
  const updated = await findUniversalContent(env, organizationId, contentId);
  if (!updated || updated.version !== nextVersion || updated.status !== target) {
    return { ok: false as const, code: "conflict" as const, currentVersion: updated?.version ?? current.version };
  }
  return { ok: true as const, content: updated, unchanged: false as const };
}

export async function addReviewComment(env: AppEnv, organizationId: string, actorId: string, contentId: string, body: unknown) {
  const content = await findUniversalContent(env, organizationId, contentId);
  if (!content) return { ok: false as const, code: "not_found" as const };
  const normalized = cleanComment(body);
  if (!normalized) return { ok: false as const, code: "invalid_comment" as const };
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO content_review_comments(id,organization_id,content_id,content_version,author_id,body,created_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7)`).bind(crypto.randomUUID(), organizationId, contentId, content.version, actorId, normalized, now),
    env.DB.prepare(`INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
      VALUES(?1,?2,?3,'content.review_comment_added','content_item',?4,?5,?6)`)
      .bind(crypto.randomUUID(), organizationId, actorId, contentId, JSON.stringify({ version: content.version }), now),
  ]);
  return { ok: true as const };
}

export async function listReviewComments(env: AppEnv, organizationId: string, contentId: string) {
  if (!await findUniversalContent(env, organizationId, contentId)) return null;
  return (await env.DB.prepare(`SELECT id,content_version AS contentVersion,author_id AS authorId,body,created_at AS createdAt
    FROM content_review_comments WHERE organization_id=?1 AND content_id=?2 ORDER BY created_at,id`)
    .bind(organizationId, contentId).all()).results;
}

export async function rollbackEditorialContent(
  env: AppEnv, organizationId: string, actorId: string, contentId: string, sourceVersion: unknown, knownVersion: unknown,
) {
  const current = await findUniversalContent(env, organizationId, contentId);
  if (!current) return { ok: false as const, code: "not_found" as const };
  if (current.status !== ContentStatus.DRAFT) return { ok: false as const, code: "draft_required" as const };
  if (Number(knownVersion) !== current.version) return { ok: false as const, code: "conflict" as const, currentVersion: current.version };
  const sourceNumber = Number(sourceVersion);
  const source = await env.DB.prepare(`SELECT metadata_json,payload_json FROM content_versions
    WHERE content_id=?1 AND organization_id=?2 AND version=?3`).bind(contentId, organizationId, sourceNumber).first<Record<string, unknown>>();
  if (!source) return { ok: false as const, code: "source_not_found" as const };
  const metadata = parseObject(source.metadata_json);
  const nextVersion = current.version + 1;
  const now = Math.max(Date.now(), current.updatedAt + 1);
  await env.DB.batch([
    env.DB.prepare(`UPDATE content_items SET category=?1,difficulty=?2,biblical_reference=?3,tags_json=?4,payload_json=?5,
      version=?6,updated_at=?7,internal_notes=?8,rollback_source_version=?9
      WHERE id=?10 AND organization_id=?11 AND version=?12 AND editorial_status='DRAFT'`)
      .bind(metadata.category, metadata.difficulty, metadata.biblicalReference ?? null, JSON.stringify(metadata.tags ?? []),
        String(source.payload_json), nextVersion, now, metadata.internalNotes ?? null, sourceNumber, contentId, organizationId, current.version),
    env.DB.prepare(`INSERT INTO content_versions(id,content_id,organization_id,version,metadata_json,payload_json,changed_by,change_summary,created_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`).bind(crypto.randomUUID(), contentId, organizationId, nextVersion,
        JSON.stringify({ ...metadata, status: ContentStatus.DRAFT, version: nextVersion, updatedAt: now, rollbackSourceVersion: sourceNumber }),
        String(source.payload_json), actorId, `Rollback da versao ${sourceNumber}`, now),
    env.DB.prepare(`INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
      VALUES(?1,?2,?3,'content.rollback_created','content_item',?4,?5,?6)`)
      .bind(crypto.randomUUID(), organizationId, actorId, contentId, JSON.stringify({ sourceVersion: sourceNumber, newVersion: nextVersion }), now),
  ]);
  return { ok: true as const, content: await findUniversalContent(env, organizationId, contentId) };
}
