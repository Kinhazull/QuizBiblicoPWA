import {
  ContentStatus,
  createContentDuplicateKey,
  legacyQuizToUniversal,
  validateContent,
  type LegacyQuizQuestion,
  type SharedContentMetadata,
  type SharedContentModel,
} from "../../shared/content";
import type { AppEnv } from "./auth";

export type UniversalImportCandidate = {
  organizationId: string;
  externalId: string;
  model: SharedContentModel;
};

export type UniversalImportEntry = UniversalImportCandidate & {
  targetStatus: typeof ContentStatus.DRAFT | typeof ContentStatus.PUBLISHED;
  issues: string[];
  duplicateOf: string | null;
  legacyArchived: boolean;
};

export type UniversalImportReport = {
  received: number;
  migrated: number;
  alreadyMigrated: number;
  invalid: number;
  duplicates: number;
  discarded: number;
  archived: number;
  published: number;
  drafts: number;
  byDifficulty: Record<string, number>;
  byTheme: Record<string, number>;
  byBook: Record<string, number>;
};

const safeJson = <T>(value: unknown, fallback: T): T => {
  try { return JSON.parse(String(value ?? "")) as T; } catch { return fallback; }
};

const increment = (target: Record<string, number>, key: string | null | undefined) => {
  const normalized = key?.normalize("NFKC").trim() || "Não informado";
  target[normalized] = (target[normalized] ?? 0) + 1;
};

function metadataSnapshot(entry: UniversalImportEntry) {
  const model = entry.model;
  return JSON.stringify({
    id: model.id,
    gameType: model.gameType,
    category: model.category,
    tags: model.tags,
    difficulty: model.difficulty,
    biblicalReference: model.biblicalReference,
    status: entry.targetStatus,
    authorId: model.authorId,
    reviewerId: model.reviewerId,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    version: model.version,
    internalNotes: model.internalNotes,
    reference: null,
    templateId: null,
  });
}

export async function planUniversalContentImport(
  env: AppEnv,
  candidates: readonly UniversalImportCandidate[],
) {
  const organizationIds = [...new Set(candidates.map(candidate => candidate.organizationId))];
  const existingRows = organizationIds.length
    ? await env.DB.prepare(`SELECT * FROM content_items WHERE organization_id IN (
        ${organizationIds.map((_, index) => `?${index + 1}`).join(",")}
      )`).bind(...organizationIds).all<Record<string, unknown>>()
    : { results: [] as Record<string, unknown>[] };
  const existingById = new Map(existingRows.results.map(row => [String(row.id), row]));
  const duplicateKeys = new Map<string, string>();
  for (const row of existingRows.results) {
    const gameType = String(row.game_type);
    const metadata = {
      id: String(row.id), gameType, category: String(row.category),
      tags: safeJson<string[]>(row.tags_json, []), difficulty: String(row.difficulty),
      biblicalReference: typeof row.biblical_reference === "string" ? row.biblical_reference : null,
      status: String(row.status), authorId: String(row.author_id),
      reviewerId: typeof row.reviewer_id === "string" ? row.reviewer_id : null,
      createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
      version: Number(row.version), internalNotes: null,
    } as SharedContentMetadata;
    const key = createContentDuplicateKey(gameType, metadata, safeJson(row.payload_json, {}));
    if (key) duplicateKeys.set(`${String(row.organization_id)}:${key.key}`, String(row.id));
  }

  const entries: UniversalImportEntry[] = [];
  for (const candidate of candidates) {
    const model = candidate.model;
    const validation = validateContent(model.gameType, {
      ...model,
      status: ContentStatus.PUBLISHED,
    }, model.content.payload);
    const duplicateKey = createContentDuplicateKey(model.gameType, model, model.content.payload);
    const matchingDuplicate = duplicateKey
      ? duplicateKeys.get(`${candidate.organizationId}:${duplicateKey.key}`) ?? null
      : null;
    const duplicateOf = matchingDuplicate === model.id ? null : matchingDuplicate;
    const legacyArchived = model.status === ContentStatus.ARCHIVED;
    const issues = validation.errors.map(issue => `${issue.field}:${issue.code}`);
    const targetStatus = validation.valid && !legacyArchived && !duplicateOf
      && model.status === ContentStatus.PUBLISHED
      ? ContentStatus.PUBLISHED
      : ContentStatus.DRAFT;
    entries.push({ ...candidate, targetStatus, issues, duplicateOf, legacyArchived });
    if (duplicateKey && !duplicateOf) {
      duplicateKeys.set(`${candidate.organizationId}:${duplicateKey.key}`, model.id);
    }
  }
  return { entries, existingById };
}

function baseReport(entries: readonly UniversalImportEntry[]): UniversalImportReport {
  const report: UniversalImportReport = {
    received: entries.length, migrated: 0, alreadyMigrated: 0,
    invalid: 0, duplicates: 0, discarded: 0, archived: 0,
    published: 0, drafts: 0, byDifficulty: {}, byTheme: {}, byBook: {},
  };
  for (const entry of entries) {
    if (entry.issues.length) report.invalid += 1;
    if (entry.duplicateOf) report.duplicates += 1;
    if (entry.legacyArchived) report.archived += 1;
    if (entry.targetStatus === ContentStatus.PUBLISHED) report.published += 1;
    else report.drafts += 1;
    increment(report.byDifficulty, entry.model.difficulty);
    const payload = entry.model.content.payload as Record<string, unknown>;
    increment(report.byTheme, typeof payload.theme === "string" ? payload.theme : entry.model.category);
    increment(report.byBook, typeof payload.book === "string" ? payload.book : null);
  }
  return report;
}

export async function importUniversalContent(
  env: AppEnv,
  actorId: string,
  candidates: readonly UniversalImportCandidate[],
  commit = false,
) {
  const { entries, existingById } = await planUniversalContentImport(env, candidates);
  const report = baseReport(entries);
  if (!commit) return { report, entries };

  const pending: { entry: UniversalImportEntry; statements: D1PreparedStatement[] }[] = [];
  for (const entry of entries) {
    const existing = existingById.get(entry.model.id);
    const payloadJson = JSON.stringify(entry.model.content.payload);
    if (existing) {
      const compatible = String(existing.organization_id) === entry.organizationId
        && String(existing.game_type) === entry.model.gameType
        && String(existing.payload_json) === payloadJson;
      if (compatible) report.alreadyMigrated += 1;
      else report.discarded += 1;
      continue;
    }
    const model = entry.model;
    const notes = [
      model.internalNotes,
      entry.duplicateOf ? `Duplicado histórico de ${entry.duplicateOf}.` : null,
      entry.issues.length ? `Validação pendente: ${entry.issues.join(", ")}.` : null,
      entry.legacyArchived ? "Arquivado no acervo legado." : null,
    ].filter(Boolean).join(" ") || null;
    const payload = model.content.payload as Record<string, unknown>;
    const theme = typeof payload.theme === "string" ? payload.theme : model.category;
    const book = typeof payload.book === "string" ? payload.book : null;
    const now = model.updatedAt;
    const statements = [
      env.DB.prepare(`INSERT INTO content_items(
        id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,
        payload_json,reference_json,template_id,version,author_id,reviewer_id,created_at,updated_at,
        source,internal_notes
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,NULL,NULL,?10,?11,?12,?13,?14,'UNIVERSAL_CMS',?15)`)
        .bind(model.id, entry.organizationId, model.gameType, entry.targetStatus, model.category,
          model.difficulty, model.biblicalReference, JSON.stringify(model.tags), payloadJson,
          model.version, model.authorId, model.reviewerId, model.createdAt, now, notes),
      env.DB.prepare(`INSERT INTO content_versions(
        id,content_id,organization_id,version,metadata_json,payload_json,changed_by,change_summary,created_at
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,'Migrado do acervo histórico do Quiz',?8)`)
        .bind(`legacy-quiz:${model.id}:v${model.version}`, model.id, entry.organizationId,
          model.version, metadataSnapshot(entry), payloadJson, actorId, now),
      env.DB.prepare(`INSERT INTO audit_logs(
        id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at
      ) VALUES(?1,?2,?3,'content.legacy_quiz_migrated','content_item',?4,?5,?6)`)
        .bind(crypto.randomUUID(), entry.organizationId, actorId, model.id,
          JSON.stringify({ externalId: entry.externalId, status: entry.targetStatus, version: model.version }), now),
    ];
    if (entry.targetStatus === ContentStatus.PUBLISHED) {
      statements.push(env.DB.prepare(`INSERT INTO universal_content_library(
        organization_id,content_id,game_type,content_version,difficulty,themes_json,books_json,tags_json,
        priority,usage_count,last_used_at,last_used_mode,first_published_at,availability_status,created_at,updated_at
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,0,0,NULL,NULL,?9,'AVAILABLE',?9,?9)`)
        .bind(entry.organizationId, model.id, model.gameType, model.version, model.difficulty,
          JSON.stringify([theme]), JSON.stringify(book ? [book] : []), JSON.stringify(model.tags), now));
    }
    pending.push({ entry, statements });
  }

  // Keep each batch small enough for D1 while avoiding one network round trip per legacy question.
  const batchSize = 25;
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const chunk = pending.slice(offset, offset + batchSize);
    try {
      await env.DB.batch(chunk.flatMap(item => item.statements));
      report.migrated += chunk.length;
    } catch (chunkError) {
      // A concurrent retry may have inserted one item. Retry the chunk item-by-item to classify
      // that safe race without hiding any other write failure.
      for (const item of chunk) {
        try {
          await env.DB.batch(item.statements);
          report.migrated += 1;
        } catch (error) {
          const concurrent = await env.DB.prepare("SELECT id FROM content_items WHERE id=?1 AND organization_id=?2")
            .bind(item.entry.model.id, item.entry.organizationId).first();
          if (concurrent) report.alreadyMigrated += 1;
          else throw error instanceof Error ? error : chunkError;
        }
      }
    }
  }
  return { report, entries };
}

export async function loadLegacyQuizImportCandidates(env: AppEnv, organizationId: string) {
  const rows = await env.DB.prepare(
    "SELECT * FROM question_bank WHERE organization_id=?1 ORDER BY created_at,id",
  ).bind(organizationId).all<Record<string, unknown>>();
  const choices = await env.DB.prepare(`SELECT choices.* FROM question_bank_choices choices
    JOIN question_bank question ON question.id=choices.question_id
    WHERE question.organization_id=?1 ORDER BY choices.question_id,choices.position`)
    .bind(organizationId).all<Record<string, unknown>>();
  const byQuestion = new Map<string, Record<string, unknown>[]>();
  for (const choice of choices.results) {
    const id = String(choice.question_id);
    byQuestion.set(id, [...(byQuestion.get(id) ?? []), choice]);
  }
  return rows.results.map(row => {
    const id = String(row.id);
    const legacy: LegacyQuizQuestion = {
      id,
      reference: typeof row.reference === "string" ? row.reference : null,
      book: typeof row.book === "string" ? row.book : null,
      theme: typeof row.theme === "string" ? row.theme : "Sem tema",
      category: typeof row.category === "string" ? row.category : null,
      difficulty: row.difficulty === "easy" || row.difficulty === "hard" ? row.difficulty : "medium",
      prompt: String(row.prompt ?? ""),
      commentary: typeof row.commentary === "string" ? row.commentary : null,
      status: row.status === "draft" || row.status === "archived" ? row.status : "active",
      reviewStatus: row.review_status === "in_review" || row.review_status === "changes_requested"
        || row.review_status === "approved" ? row.review_status : "draft",
      version: Math.max(1, Number(row.version) || 1),
      createdBy: String(row.created_by),
      updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      internalNotes: "Origem: acervo legado do Quiz; identificador histórico preservado.",
      choices: (byQuestion.get(id) ?? []).map(choice => ({
        id: String(choice.id), text: String(choice.text), position: Number(choice.position),
        correct: Number(choice.correct) === 1,
      })),
    };
    return { organizationId, externalId: id, model: legacyQuizToUniversal(legacy) };
  });
}

export async function migrateLegacyQuizArchive(
  env: AppEnv,
  organizationId: string,
  actorId: string,
  commit = false,
) {
  const candidates = await loadLegacyQuizImportCandidates(env, organizationId);
  return importUniversalContent(env, actorId, candidates, commit);
}
