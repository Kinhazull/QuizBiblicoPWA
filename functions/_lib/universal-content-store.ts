import {
  ContentStatus,
  getContentSchema,
  validateContent,
  type GameType,
  type SharedContentModel,
} from "../../shared/content";
import type { AppEnv } from "./auth";
import {
  prepareDraftContentLibrarySync,
  preparePublishedContentLibrarySync,
} from "./universal-content-library";

export type UniversalContentSource = "UNIVERSAL_CMS";
export type PersistedUniversalContent = {
  id: string;
  organizationId: string;
  gameType: GameType;
  status: (typeof ContentStatus)[keyof typeof ContentStatus];
  publicationStatus: typeof ContentStatus.DRAFT | typeof ContentStatus.PUBLISHED;
  category: string;
  difficulty: SharedContentModel["difficulty"];
  biblicalReference: string | null;
  tags: string[];
  payload: Record<string, unknown>;
  reference: { id: string; label: string; type: string } | null;
  templateId: string | null;
  version: number;
  authorId: string;
  reviewerId: string | null;
  createdAt: number;
  updatedAt: number;
  source: UniversalContentSource;
  internalNotes: string | null;
  submittedBy: string | null;
  submittedAt: number | null;
  reviewedBy: string | null;
  reviewedAt: number | null;
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | null;
  reviewComment: string | null;
  rollbackSourceVersion: number | null;
};

type ContentInput = {
  gameType?: unknown;
  status?: unknown;
  templateId?: unknown;
  metadata?: unknown;
  payload?: unknown;
  reference?: unknown;
  version?: unknown;
  changeSummary?: unknown;
};

type ContentRow = Record<string, unknown>;
const plainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const safeJson = <T>(value: unknown, fallback: T): T => {
  try {
    const parsed = JSON.parse(String(value ?? ""));
    return parsed as T;
  } catch {
    return fallback;
  }
};
const textOrNull = (value: unknown, maximum: number) => {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim();
  return normalized ? normalized.slice(0, maximum) : null;
};
const normalizedReference = (value: unknown) => {
  if (!plainObject(value)) return null;
  const label = textOrNull(value.label, 160) ?? "";
  const id = textOrNull(value.id, 120) ?? "";
  const type = textOrNull(value.type, 40) ?? "passage";
  return label || id ? { id, label, type } : null;
};

export function rowToUniversalContent(row: ContentRow): PersistedUniversalContent {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    gameType: String(row.game_type) as GameType,
    status: Object.values(ContentStatus).includes(String(row.editorial_status) as never)
      ? String(row.editorial_status) as PersistedUniversalContent["status"]
      : row.status === ContentStatus.PUBLISHED ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
    publicationStatus: row.status === ContentStatus.PUBLISHED ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
    category: String(row.category),
    difficulty: String(row.difficulty) as SharedContentModel["difficulty"],
    biblicalReference: typeof row.biblical_reference === "string" ? row.biblical_reference : null,
    tags: safeJson<string[]>(row.tags_json, []).filter(value => typeof value === "string"),
    payload: safeJson<Record<string, unknown>>(row.payload_json, {}),
    reference: safeJson<PersistedUniversalContent["reference"]>(row.reference_json, null),
    templateId: typeof row.template_id === "string" ? row.template_id : null,
    version: Number(row.version),
    authorId: String(row.author_id),
    reviewerId: typeof row.reviewer_id === "string" ? row.reviewer_id : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    source: "UNIVERSAL_CMS",
    internalNotes: typeof row.internal_notes === "string" ? row.internal_notes : null,
    submittedBy: typeof row.submitted_by === "string" ? row.submitted_by : null,
    submittedAt: row.submitted_at == null ? null : Number(row.submitted_at),
    reviewedBy: typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    reviewedAt: row.reviewed_at == null ? null : Number(row.reviewed_at),
    reviewDecision: row.review_decision === "APPROVED" || row.review_decision === "CHANGES_REQUESTED" ? row.review_decision : null,
    reviewComment: typeof row.review_comment === "string" ? row.review_comment : null,
    rollbackSourceVersion: row.rollback_source_version == null ? null : Number(row.rollback_source_version),
  };
}

export function normalizeUniversalDraft(
  input: unknown,
  identity: { id: string; organizationId: string; authorId: string; createdAt: number; version: number },
) {
  if (!plainObject(input)) return {
    ok: false as const,
    errors: [{ field: "body", code: "invalid_type", message: "O corpo deve ser um objeto." }],
  };
  const body = input as ContentInput;
  if (body.status !== undefined && body.status !== ContentStatus.DRAFT) return {
    ok: false as const,
    errors: [{ field: "status", code: "draft_only", message: "Somente rascunhos podem ser salvos nesta etapa." }],
  };
  const gameType = typeof body.gameType === "string"
    ? body.gameType
    : plainObject(body.metadata) && typeof body.metadata.gameType === "string"
      ? body.metadata.gameType
      : "";
  if (!getContentSchema(gameType)) return {
    ok: false as const,
    errors: [{ field: "gameType", code: "unsupported_game", message: "Tipo de jogo inválido." }],
  };
  const sourceMetadata = plainObject(body.metadata) ? body.metadata : {};
  const now = Date.now();
  const reference = normalizedReference(body.reference);
  const metadata = {
    ...sourceMetadata,
    id: identity.id,
    gameType,
    status: ContentStatus.DRAFT,
    authorId: identity.authorId,
    reviewerId: null,
    createdAt: identity.createdAt,
    updatedAt: now,
    version: identity.version,
    biblicalReference: reference?.label || sourceMetadata.biblicalReference || null,
  };
  const validation = validateContent(gameType, metadata, body.payload);
  if (!validation.valid || !validation.normalizedValue) return {
    ok: false as const,
    errors: validation.errors,
  };
  return {
    ok: true as const,
    value: {
      model: validation.normalizedValue,
      reference,
      templateId: textOrNull(body.templateId, 100),
      changeSummary: textOrNull(body.changeSummary, 240),
      organizationId: identity.organizationId,
    },
  };
}

const metadataSnapshot = (
  model: SharedContentModel,
  reference: PersistedUniversalContent["reference"],
  templateId: string | null,
) => JSON.stringify({
  id: model.id,
  gameType: model.gameType,
  category: model.category,
  tags: model.tags,
  difficulty: model.difficulty,
  biblicalReference: model.biblicalReference,
  status: model.status,
  authorId: model.authorId,
  reviewerId: model.reviewerId,
  createdAt: model.createdAt,
  updatedAt: model.updatedAt,
  version: model.version,
  internalNotes: model.internalNotes,
  reference,
  templateId,
});

export async function findUniversalContent(env: AppEnv, organizationId: string, id: string) {
  const row = await env.DB.prepare(
    "SELECT * FROM content_items WHERE id=?1 AND organization_id=?2",
  ).bind(id, organizationId).first<ContentRow>();
  return row ? rowToUniversalContent(row) : null;
}

export async function findPublishedUniversalContent(
  env: AppEnv,
  organizationId: string,
  gameType: GameType,
  id?: string,
) {
  const row = id
    ? await env.DB.prepare(
      `SELECT * FROM content_items
       WHERE id=?1 AND organization_id=?2 AND game_type=?3 AND status='PUBLISHED'`,
    ).bind(id, organizationId, gameType).first<ContentRow>()
    : await env.DB.prepare(
      `SELECT * FROM content_items
       WHERE organization_id=?1 AND game_type=?2 AND status='PUBLISHED'
       ORDER BY updated_at DESC,id LIMIT 1`,
    ).bind(organizationId, gameType).first<ContentRow>();
  return row ? rowToUniversalContent(row) : null;
}

export async function createUniversalDraft(
  env: AppEnv,
  organizationId: string,
  authorId: string,
  input: unknown,
) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const normalized = normalizeUniversalDraft(input, {
    id, organizationId, authorId, createdAt: now, version: 1,
  });
  if (!normalized.ok) return normalized;
  const { model, reference, templateId, changeSummary } = normalized.value;
  const payloadJson = JSON.stringify(model.content.payload);
  const metadataJson = metadataSnapshot(model, reference, templateId);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO content_items(
      id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,
      payload_json,reference_json,template_id,version,author_id,reviewer_id,created_at,updated_at,
      source,internal_notes,editorial_status
    ) VALUES(?1,?2,?3,'DRAFT',?4,?5,?6,?7,?8,?9,?10,1,?11,NULL,?12,?12,'UNIVERSAL_CMS',?13,'DRAFT')`)
      .bind(id, organizationId, model.gameType, model.category, model.difficulty,
        model.biblicalReference, JSON.stringify(model.tags), payloadJson,
        reference ? JSON.stringify(reference) : null, templateId, authorId, now, model.internalNotes),
    env.DB.prepare(`INSERT INTO content_versions(
      id,content_id,organization_id,version,metadata_json,payload_json,changed_by,change_summary,created_at
    ) VALUES(?1,?2,?3,1,?4,?5,?6,?7,?8)`)
      .bind(crypto.randomUUID(), id, organizationId, metadataJson, payloadJson, authorId,
        changeSummary ?? "Rascunho criado", now),
    env.DB.prepare(`INSERT INTO audit_logs(
      id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at
    ) VALUES(?1,?2,?3,'content.draft_created','content_item',?4,?5,?6)`)
      .bind(crypto.randomUUID(), organizationId, authorId, id,
        JSON.stringify({ gameType: model.gameType, version: 1 }), now),
  ]);
  return { ok: true as const, content: await findUniversalContent(env, organizationId, id) };
}

export async function updateUniversalDraft(
  env: AppEnv,
  organizationId: string,
  actorId: string,
  id: string,
  input: unknown,
) {
  const current = await findUniversalContent(env, organizationId, id);
  if (!current) return { ok: false as const, notFound: true as const };
  if (current.status !== ContentStatus.DRAFT) {
    return { ok: false as const, locked: true as const, currentStatus: current.status };
  }
  const knownVersion = plainObject(input) ? Number(input.version ?? (plainObject(input.metadata) ? input.metadata.version : NaN)) : NaN;
  if (!Number.isInteger(knownVersion) || knownVersion !== current.version) {
    await env.DB.prepare(`INSERT INTO audit_logs(
      id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at
    ) VALUES(?1,?2,?3,'content.version_conflict','content_item',?4,?5,?6)`)
      .bind(crypto.randomUUID(), organizationId, actorId, id,
        JSON.stringify({ expectedVersion: knownVersion, currentVersion: current.version }), Date.now()).run();
    return { ok: false as const, conflict: true as const, currentVersion: current.version };
  }
  const nextVersion = current.version + 1;
  const normalized = normalizeUniversalDraft(input, {
    id,
    organizationId,
    authorId: current.authorId,
    createdAt: current.createdAt,
    version: nextVersion,
  });
  if (!normalized.ok) return normalized;
  const { model, reference, templateId, changeSummary } = normalized.value;
  const now = model.updatedAt;
  const payloadJson = JSON.stringify(model.content.payload);
  const metadataJson = metadataSnapshot(model, reference, templateId);
  try {
    await env.DB.batch([
      env.DB.prepare(`UPDATE content_items SET
        game_type=?1,category=?2,difficulty=?3,biblical_reference=?4,tags_json=?5,payload_json=?6,
        reference_json=?7,template_id=?8,version=?9,updated_at=?10,internal_notes=?11
        WHERE id=?12 AND organization_id=?13 AND version=?14 AND status='DRAFT'`)
        .bind(model.gameType, model.category, model.difficulty, model.biblicalReference,
          JSON.stringify(model.tags), payloadJson, reference ? JSON.stringify(reference) : null,
          templateId, nextVersion, now, model.internalNotes, id, organizationId, current.version),
      env.DB.prepare(`INSERT INTO content_versions(
        id,content_id,organization_id,version,metadata_json,payload_json,changed_by,change_summary,created_at
      ) SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9
        WHERE (SELECT version FROM content_items WHERE id=?2 AND organization_id=?3)=?4`)
        .bind(crypto.randomUUID(), id, organizationId, nextVersion, metadataJson, payloadJson,
          actorId, changeSummary ?? `Rascunho atualizado para versão ${nextVersion}`, now),
      env.DB.prepare(`INSERT INTO audit_logs(
        id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at
      ) SELECT ?1,?2,?3,'content.draft_updated','content_item',?4,?5,?6
        WHERE (SELECT version FROM content_items WHERE id=?4 AND organization_id=?2)=?7`)
        .bind(crypto.randomUUID(), organizationId, actorId, id,
          JSON.stringify({ gameType: model.gameType, version: nextVersion }), now, nextVersion),
    ]);
  } catch {
    const latest = await findUniversalContent(env, organizationId, id);
    if (latest && latest.version !== current.version) {
      return { ok: false as const, conflict: true as const, currentVersion: latest.version };
    }
    throw new Error("universal_content_update_failed");
  }
  const updated = await findUniversalContent(env, organizationId, id);
  if (!updated || updated.version !== nextVersion) {
    return { ok: false as const, conflict: true as const, currentVersion: updated?.version ?? current.version };
  }
  return { ok: true as const, content: updated };
}

export async function transitionUniversalContentStatus(
  env: AppEnv,
  organizationId: string,
  actorId: string,
  id: string,
  targetStatus: typeof ContentStatus.DRAFT | typeof ContentStatus.PUBLISHED,
  knownVersion: unknown,
) {
  const current = await findUniversalContent(env, organizationId, id);
  if (!current) return { ok: false as const, notFound: true as const };
  const expectedVersion = Number(knownVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion !== current.version) {
    return { ok: false as const, conflict: true as const, currentVersion: current.version };
  }
  if (current.status === targetStatus) {
    return { ok: true as const, content: current, unchanged: true as const };
  }
  const allowed = (
    current.status === ContentStatus.DRAFT && targetStatus === ContentStatus.PUBLISHED
  ) || (
    current.status === ContentStatus.PUBLISHED && targetStatus === ContentStatus.DRAFT
  );
  if (!allowed) return { ok: false as const, invalidTransition: true as const };

  const nextVersion = current.version + 1;
  const now = Math.max(Date.now(), current.updatedAt + 1);
  const validation = validateContent(current.gameType, {
    id: current.id,
    gameType: current.gameType,
    category: current.category,
    tags: current.tags,
    difficulty: current.difficulty,
    biblicalReference: current.biblicalReference,
    status: targetStatus,
    authorId: current.authorId,
    reviewerId: current.reviewerId,
    createdAt: current.createdAt,
    updatedAt: now,
    version: nextVersion,
    internalNotes: current.internalNotes,
  }, current.payload);
  if (!validation.valid || !validation.normalizedValue) {
    return { ok: false as const, errors: validation.errors };
  }
  const model = validation.normalizedValue;
  const metadataJson = metadataSnapshot(model, current.reference, current.templateId);
  const action = targetStatus === ContentStatus.PUBLISHED
    ? "content.published"
    : "content.returned_to_draft";
  const changeSummary = targetStatus === ContentStatus.PUBLISHED
    ? `Conteúdo publicado na versão ${nextVersion}`
    : `Conteúdo retornado para rascunho na versão ${nextVersion}`;
  try {
    const librarySync = targetStatus === ContentStatus.PUBLISHED
      ? preparePublishedContentLibrarySync(env, current, nextVersion, now)
      : prepareDraftContentLibrarySync(env, current, nextVersion, now);
    await env.DB.batch([
      env.DB.prepare(`UPDATE content_items
        SET status=?1,editorial_status=?1,version=?2,updated_at=?3
        WHERE id=?4 AND organization_id=?5 AND version=?6 AND status=?7`)
        .bind(targetStatus, nextVersion, now, id, organizationId, current.version, current.status),
      env.DB.prepare(`INSERT INTO content_versions(
        id,content_id,organization_id,version,metadata_json,payload_json,changed_by,change_summary,created_at
      ) SELECT ?1,?2,?3,?4,?5,payload_json,?6,?7,?8
        FROM content_items WHERE id=?2 AND organization_id=?3 AND version=?4 AND status=?9`)
        .bind(crypto.randomUUID(), id, organizationId, nextVersion, metadataJson, actorId,
          changeSummary, now, targetStatus),
      env.DB.prepare(`INSERT INTO audit_logs(
        id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at
      ) SELECT ?1,?2,?3,?4,'content_item',?5,?6,?7
        WHERE EXISTS(
          SELECT 1 FROM content_items
          WHERE id=?5 AND organization_id=?2 AND version=?8 AND status=?9
        )`)
        .bind(crypto.randomUUID(), organizationId, actorId, action, id,
          JSON.stringify({ fromStatus: current.status, toStatus: targetStatus, version: nextVersion }),
          now, nextVersion, targetStatus),
      librarySync,
    ]);
  } catch {
    const latest = await findUniversalContent(env, organizationId, id);
    if (latest && (latest.version !== current.version || latest.status !== current.status)) {
      return { ok: false as const, conflict: true as const, currentVersion: latest.version };
    }
    throw new Error("universal_content_transition_failed");
  }
  const updated = await findUniversalContent(env, organizationId, id);
  if (!updated || updated.version !== nextVersion || updated.status !== targetStatus) {
    return {
      ok: false as const,
      conflict: true as const,
      currentVersion: updated?.version ?? current.version,
    };
  }
  return { ok: true as const, content: updated, unchanged: false as const };
}

export async function listUniversalVersions(env: AppEnv, organizationId: string, contentId: string) {
  const owned = await findUniversalContent(env, organizationId, contentId);
  if (!owned) return null;
  const rows = await env.DB.prepare(`SELECT
    id,version,metadata_json AS metadataJson,payload_json AS payloadJson,
    changed_by AS changedBy,change_summary AS changeSummary,created_at AS createdAt
    FROM content_versions WHERE content_id=?1 AND organization_id=?2 ORDER BY version DESC`)
    .bind(contentId, organizationId).all();
  return rows.results;
}
