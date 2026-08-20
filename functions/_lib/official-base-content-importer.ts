import pack from "../../content/official-base-content-v1.json" with { type: "json" };
import {
  ContentStatus,
  GameType,
  type Difficulty,
  type GameSpecificContent,
  type SharedContentModel,
} from "../../shared/content";
import type { AppEnv } from "./auth";
import { importUniversalContent, type UniversalImportCandidate } from "./universal-content-importer";

type OfficialPackEntry = {
  externalId: string;
  gameType: string;
  category: string;
  difficulty: string;
  biblicalReference: string;
  tags: string[];
  payload: Record<string, unknown>;
};

const EXPECTED_COUNTS: Readonly<Record<string, number>> = Object.freeze({
  [GameType.WORDLE]: 120,
  [GameType.TIMELINE]: 40,
  [GameType.MEMORY]: 40,
  [GameType.ASSOCIATION]: 60,
  [GameType.WHO_AM_I]: 60,
  [GameType.THREE_CLUES]: 60,
});

const OFFICIAL_BASE_TIMESTAMP = Date.UTC(2026, 7, 2);
const safeId = (value: string) => value.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

export function buildOfficialBaseCandidates(
  organizationId: string,
  actorId: string,
): UniversalImportCandidate[] {
  const entries = pack.contents as OfficialPackEntry[];
  for (const [gameType, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = entries.filter(entry => entry.gameType === gameType).length;
    if (actual !== expected) throw new Error(`official_base_count_mismatch:${gameType}`);
  }
  if (entries.length !== 380 || new Set(entries.map(entry => entry.externalId)).size !== entries.length) {
    throw new Error("official_base_identity_mismatch");
  }
  return entries.map(entry => {
    const id = `official-base-v1-${safeId(organizationId)}-${safeId(entry.gameType)}-${safeId(entry.externalId)}`;
    const model: SharedContentModel = {
      id,
      gameType: entry.gameType as SharedContentModel["gameType"],
      category: entry.category,
      tags: entry.tags,
      difficulty: entry.difficulty as Difficulty,
      biblicalReference: entry.biblicalReference,
      status: ContentStatus.PUBLISHED,
      authorId: actorId,
      reviewerId: actorId,
      createdAt: OFFICIAL_BASE_TIMESTAMP,
      updatedAt: OFFICIAL_BASE_TIMESTAMP,
      version: 1,
      internalNotes: "Conteúdo permanente do Acervo Oficial v1.",
      content: {
        gameType: entry.gameType,
        payload: entry.payload,
      } as GameSpecificContent,
    };
    return { organizationId, externalId: entry.externalId, model };
  });
}

const increment = (target: Record<string, number>, key: string) => {
  target[key] = (target[key] ?? 0) + 1;
};

export async function importOfficialBaseContent(
  env: AppEnv,
  organizationId: string,
  actorId: string,
  commit = false,
) {
  const candidates = buildOfficialBaseCandidates(organizationId, actorId);
  const result = await importUniversalContent(env, actorId, candidates, commit, {
    source: "UNIVERSAL_CMS",
    versionIdPrefix: "official-base-v1",
    changeSummary: "Importado do Acervo Oficial v1",
    auditAction: "content.official_base_imported",
  });
  const prefix = `official-base-v1-${safeId(organizationId)}-`;
  const prefixUpperBound = `${prefix}\uffff`;
  const persisted = await env.DB.prepare(`SELECT id,version,payload_json,category,difficulty,biblical_reference,tags_json,status
    FROM content_items WHERE organization_id=?1 AND id>=?2 AND id<?3`)
    .bind(organizationId, prefix, prefixUpperBound).all<{
      id: string; version: number; payload_json: string; category: string; difficulty: string;
      biblical_reference: string; tags_json: string; status: string;
    }>();
  const persistedById = new Map((persisted.results || []).map(row => [row.id, row]));
  const changed = candidates.filter(candidate => {
    const row = persistedById.get(candidate.model.id);
    if (!row) return false;
    const model = candidate.model;
    return row.payload_json !== JSON.stringify(model.content.payload)
      || row.category !== model.category
      || row.difficulty !== model.difficulty
      || row.biblical_reference !== model.biblicalReference
      || row.tags_json !== JSON.stringify(model.tags)
      || row.status !== ContentStatus.PUBLISHED;
  });
  const updatesRequired = changed.length;
  let reconciled = 0;

  if (commit && changed.length) {
    const now = Date.now();
    for (let offset = 0; offset < changed.length; offset += 20) {
      const chunk = changed.slice(offset, offset + 20);
      const statements = chunk.flatMap(candidate => {
        const current = persistedById.get(candidate.model.id)!;
        const model = candidate.model;
        const version = Number(current.version) + 1;
        const payloadJson = JSON.stringify(model.content.payload);
        const payload = model.content.payload as Record<string, unknown>;
        const theme = typeof payload.theme === "string" ? payload.theme : model.category;
        const book = typeof payload.book === "string" ? payload.book : null;
        const metadataJson = JSON.stringify({
          id: model.id, gameType: model.gameType, category: model.category, tags: model.tags,
          difficulty: model.difficulty, biblicalReference: model.biblicalReference,
          status: ContentStatus.PUBLISHED, authorId: model.authorId, reviewerId: actorId,
          createdAt: model.createdAt, updatedAt: now, version,
          internalNotes: "Conteúdo reconciliado com o Acervo Oficial v1 versionado.",
        });
        return [
          env.DB.prepare(`UPDATE content_items SET category=?1,difficulty=?2,biblical_reference=?3,
            tags_json=?4,payload_json=?5,version=?6,reviewer_id=?7,updated_at=?8,
            status='PUBLISHED',editorial_status='PUBLISHED',internal_notes=?9
            WHERE id=?10 AND organization_id=?11 AND version=?12`)
            .bind(model.category, model.difficulty, model.biblicalReference, JSON.stringify(model.tags),
              payloadJson, version, actorId, now, "Reconciliado com o Acervo Oficial v1.",
              model.id, organizationId, current.version),
          env.DB.prepare(`INSERT INTO content_versions(
            id,content_id,organization_id,version,metadata_json,payload_json,changed_by,change_summary,created_at
          ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`)
            .bind(`official-base-v1-reconcile:${model.id}:v${version}`, model.id, organizationId,
              version, metadataJson, payloadJson, actorId, "Reconciliado com o pacote oficial versionado", now),
          env.DB.prepare(`UPDATE universal_content_library SET content_version=?1,difficulty=?2,
            themes_json=?3,books_json=?4,tags_json=?5,updated_at=?6
            WHERE organization_id=?7 AND content_id=?8`)
            .bind(version, model.difficulty, JSON.stringify([theme]), JSON.stringify(book ? [book] : []),
              JSON.stringify(model.tags), now, organizationId, model.id),
          env.DB.prepare(`INSERT INTO audit_logs(
            id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at
          ) VALUES(?1,?2,?3,'content.official_base_reconciled','content_item',?4,?5,?6)`)
            .bind(crypto.randomUUID(), organizationId, actorId, model.id,
              JSON.stringify({ fromVersion: current.version, toVersion: version, externalId: candidate.externalId }), now),
        ];
      });
      await env.DB.batch(statements);
      reconciled += chunk.length;
    }
  }
  const byGame: Record<string, {
    found: number; valid: number; invalid: number; duplicates: number;
    publishable: number; drafts: number; discarded: number;
    missingReferences: number; byDifficulty: Record<string, number>;
    byCategory: Record<string, number>; byTheme: Record<string, number>;
    problemExamples: { id: string; issues: string[] }[];
  }> = {};
  for (const entry of result.entries) {
    const report = byGame[entry.model.gameType] ??= {
      found: 0, valid: 0, invalid: 0, duplicates: 0, publishable: 0,
      drafts: 0, discarded: 0, missingReferences: 0,
      byDifficulty: {}, byCategory: {}, byTheme: {}, problemExamples: [],
    };
    report.found += 1;
    if (entry.issues.length) report.invalid += 1; else report.valid += 1;
    if (entry.duplicateOf) report.duplicates += 1;
    if (entry.targetStatus === ContentStatus.PUBLISHED) report.publishable += 1;
    else report.drafts += 1;
    if (!entry.model.biblicalReference) report.missingReferences += 1;
    increment(report.byDifficulty, entry.model.difficulty);
    increment(report.byCategory, entry.model.category);
    for (const theme of entry.model.tags) increment(report.byTheme, theme);
    if ((entry.issues.length || entry.duplicateOf) && report.problemExamples.length < 5) {
      report.problemExamples.push({
        id: entry.model.id,
        issues: [...entry.issues, ...(entry.duplicateOf ? ["duplicate"] : [])],
      });
    }
  }
  return { ...result, report: { ...result.report, updatesRequired, reconciled }, byGame };
}
