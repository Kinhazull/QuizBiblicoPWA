import { ContentStatus, validateContent, type SharedContentModel } from "../../shared/content";
import type { AppEnv } from "./auth";
import { importUniversalContent, type UniversalImportCandidate } from "./universal-content-importer";

const plain = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const splitCsv = (line: string) => { const out: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) { const char = line[i]; if (char === '"' && line[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { out.push(value); value = ""; } else value += char; }
  out.push(value); return out; };
export function parseUniversalImport(format: unknown, data: unknown) {
  if (String(format).toUpperCase() === "JSON") {
    try { const parsed = typeof data === "string" ? JSON.parse(data) : data; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  if (String(format).toUpperCase() !== "CSV" || typeof data !== "string") return [];
  const lines = data.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean); if (lines.length < 2) return [];
  const headers = splitCsv(lines[0]); return lines.slice(1).map(line => Object.fromEntries(headers.map((header, index) => [header.trim(), splitCsv(line)[index] ?? ""]))).map(row => ({
    externalId: row.externalId, gameType: row.gameType, status: row.status, metadata: {
      category: row.category, difficulty: row.difficulty, biblicalReference: row.biblicalReference,
      tags: row.tags ? row.tags.split("|").map(value => value.trim()).filter(Boolean) : [],
    }, payload: (() => { try { return JSON.parse(row.payload || "{}"); } catch { return {}; } })(),
  }));
}

export async function runUniversalAdminImport(env: AppEnv, organizationId: string, actorId: string, body: unknown) {
  const source = plain(body) ? body : {}; const rows = parseUniversalImport(source.format, source.data);
  const errors: { item: number; errors: unknown }[] = []; const candidates: UniversalImportCandidate[] = [];
  rows.forEach((raw, index) => { if (!plain(raw)) { errors.push({ item: index + 1, errors: ["invalid_item"] }); return; }
    const metadata = plain(raw.metadata) ? raw.metadata : raw; const externalId = String(raw.externalId || `row-${index + 1}`);
    const id = String(raw.id || `universal-import:${organizationId}:${externalId}`); const now = Date.now(); const status = raw.status === ContentStatus.PUBLISHED ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
    const validation = validateContent(String(raw.gameType || metadata.gameType), { ...metadata, id, gameType: raw.gameType || metadata.gameType,
      status, authorId: actorId, reviewerId: null, createdAt: now, updatedAt: now, version: 1, internalNotes: metadata.internalNotes ?? null }, raw.payload);
    if (!validation.valid || !validation.normalizedValue) errors.push({ item: index + 1, errors: validation.errors });
    else candidates.push({ organizationId, externalId, model: validation.normalizedValue as SharedContentModel });
  });
  const commit = source.confirmation === "IMPORTAR_CONTEUDO_UNIVERSAL";
  const result = await importUniversalContent(env, actorId, candidates, commit, { source: "UNIVERSAL_CMS", versionIdPrefix: "universal-import", changeSummary: "Importacao universal administrativa", auditAction: "content.universal_imported" });
  return { dryRun: !commit, found: rows.length, valid: candidates.length, invalid: errors.length, errors: errors.slice(0, 50), ...result.report };
}
