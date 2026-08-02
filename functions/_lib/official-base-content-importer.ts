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
  return { ...result, byGame };
}
