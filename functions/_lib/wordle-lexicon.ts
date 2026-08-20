import { GameType } from "../../shared/content";
import { normalizeWord } from "../../app/games/wordle/engine";
import type { AppEnv } from "./auth";
import { isBundledWordleGuess } from "../../shared/wordle-accepted-guesses";

export async function isPublishedWordleGuess(
  env: AppEnv,
  organizationId: string,
  value: string,
) {
  const guess = normalizeWord(value);
  if (!guess) return false;
  if (isBundledWordleGuess(guess)) return true;
  const row = await env.DB.prepare(`SELECT 1 AS found
    FROM content_items
    WHERE organization_id=?1 AND game_type=?2 AND status='PUBLISHED'
      AND UPPER(json_extract(payload_json,'$.word'))=?3
    LIMIT 1`)
    .bind(organizationId, GameType.WORDLE, guess).first<{ found: number }>();
  return row?.found === 1;
}
