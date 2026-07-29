import {
  ContentStatus,
  GameType,
  validateContent,
  type WordleContentPayload,
} from "../../../shared/content";
import type { AppEnv } from "../auth";
import { findGeneratedSelectionById } from "../universal-game-generator";

const safeJson = <T>(value: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(value ?? "")) as T;
  } catch {
    return fallback;
  }
};

export async function resolveWordlePilotSelection(
  env: AppEnv,
  organizationId: string,
  selectionId: string,
  now = Date.now(),
) {
  const selection = await findGeneratedSelectionById(env, organizationId, selectionId);
  if (
    !selection
    || selection.gameType !== GameType.WORDLE
    || selection.items.length !== 1
    || (selection.expiresAt !== null && selection.expiresAt <= now)
  ) return null;
  const item = selection.items[0];
  const row = await env.DB.prepare(`SELECT metadata_json,payload_json
    FROM content_versions
    WHERE organization_id=?1 AND content_id=?2 AND version=?3`)
    .bind(organizationId, item.contentId, item.contentVersion)
    .first<Record<string, unknown>>();
  if (!row) return null;
  const metadata = safeJson<Record<string, unknown>>(row.metadata_json, {});
  const payload = safeJson<Record<string, unknown>>(row.payload_json, {});
  if (
    metadata.status !== ContentStatus.PUBLISHED
    || metadata.gameType !== GameType.WORDLE
    || !validateContent(GameType.WORDLE, metadata, payload).valid
  ) return null;
  const wordle = payload as WordleContentPayload;
  return {
    selection: {
      id: selection.id,
      algorithmVersion: selection.algorithmVersion,
      createdAt: selection.createdAt,
      expiresAt: selection.expiresAt,
    },
    content: {
      id: item.contentId,
      version: item.contentVersion,
      hint: wordle.hint,
      wordLength: [...wordle.word].length,
      biblicalReference: typeof metadata.biblicalReference === "string"
        ? metadata.biblicalReference
        : null,
    },
  };
}
