import type { AppEnv } from "./auth";
import { QUESTION_COUNT, normalizeQuestion } from "./questions";

export const ROUND_RULES = { questionCount: QUESTION_COUNT, minimumSeconds: 15, maximumSeconds: 60, minimumAttempts: 1, maximumAttempts: 5 } as const;
export const BLOCKING_ROUND_STATUSES = ["scheduled", "active"] as const;

export async function findRoundScheduleConflict(env: AppEnv, organizationId: string, opensAt: number, closesAt: number, ignoreRoundId?: string) {
  if (!Number.isFinite(opensAt) || !Number.isFinite(closesAt)) return null;
  const conflict: any = await env.DB.prepare(`SELECT id,title,opens_at opensAt,closes_at closesAt FROM rounds WHERE organization_id=?1 AND status IN ('scheduled','active') AND opens_at<?2 AND closes_at>?3 AND (?4 IS NULL OR id<>?4) ORDER BY opens_at,id LIMIT 1`).bind(organizationId, closesAt, opensAt, ignoreRoundId || null).first();
  return conflict ? { id: conflict.id, title: conflict.title, opensAt: Number(conflict.opensAt), closesAt: Number(conflict.closesAt) } : null;
}

export async function validateRoundSeason(env: AppEnv, organizationId: string, roundType: string, seasonId: string | null, opensAt: number, closesAt: number) {
  if (roundType !== "regular") return { ok: true as const };
  if (!seasonId) return { ok: false as const, error: "season_required" };
  const season: any = await env.DB.prepare("SELECT id,status,starts_at,ends_at FROM seasons WHERE id=?1 AND organization_id=?2").bind(seasonId, organizationId).first();
  if (!season || season.status === "cancelled") return { ok: false as const, error: "invalid_season" };
  if (Number(season.starts_at) > opensAt || Number(season.ends_at) < closesAt) return { ok: false as const, error: "round_outside_season" };
  return { ok: true as const, season };
}

export function validateRoundConfiguration(input: { opensAt: number; closesAt: number; secondsPerQuestion: number; attemptLimit: number }) {
  if (!Number.isFinite(input.opensAt) || !Number.isFinite(input.closesAt) || input.closesAt <= input.opensAt) return "invalid_schedule";
  if (!Number.isInteger(input.secondsPerQuestion) || input.secondsPerQuestion < ROUND_RULES.minimumSeconds || input.secondsPerQuestion > ROUND_RULES.maximumSeconds) return "invalid_question_time";
  if (!Number.isInteger(input.attemptLimit) || input.attemptLimit < ROUND_RULES.minimumAttempts || input.attemptLimit > ROUND_RULES.maximumAttempts) return "invalid_attempt_limit";
  return null;
}

export async function validateStoredRound(env: AppEnv, roundId: string, organizationId: string, overrides: Partial<{ opensAt: number; closesAt: number; secondsPerQuestion: number; attemptLimit: number; seasonId: string | null; roundType: string }> = {}) {
  const round: any = await env.DB.prepare("SELECT * FROM rounds WHERE id=?1 AND organization_id=?2").bind(roundId, organizationId).first();
  if (!round) return { ok: false as const, error: "not_found" };
  const configurationError = validateRoundConfiguration({ opensAt: overrides.opensAt ?? Number(round.opens_at), closesAt: overrides.closesAt ?? Number(round.closes_at), secondsPerQuestion: overrides.secondsPerQuestion ?? Number(round.seconds_per_question), attemptLimit: overrides.attemptLimit ?? Number(round.official_attempt_limit) });
  if (configurationError) return { ok: false as const, error: configurationError };
  const seasonValidation = await validateRoundSeason(env, organizationId, overrides.roundType ?? round.round_type ?? "regular", overrides.seasonId === undefined ? round.season_id : overrides.seasonId, overrides.opensAt ?? Number(round.opens_at), overrides.closesAt ?? Number(round.closes_at));
  if (!seasonValidation.ok) return seasonValidation;
  const questions = await env.DB.prepare("SELECT id,position,prompt,active FROM questions WHERE round_id=?1 ORDER BY position").bind(roundId).all();
  if (questions.results.length !== ROUND_RULES.questionCount || (questions.results as any[]).some((question, index) => !question.active || Number(question.position) !== index + 1)) return { ok: false as const, error: "invalid_round_questions" };
  if (new Set((questions.results as any[]).map(question => normalizeQuestion(question.prompt))).size !== ROUND_RULES.questionCount) return { ok: false as const, error: "duplicate_in_round" };
  const choices = await env.DB.prepare("SELECT c.question_id questionId,c.position,c.text,c.correct FROM choices c JOIN questions q ON q.id=c.question_id WHERE q.round_id=?1 ORDER BY c.question_id,c.position").bind(roundId).all();
  const grouped = new Map<string, any[]>(); for (const choice of choices.results as any[]) { const list = grouped.get(choice.questionId) || []; list.push(choice); grouped.set(choice.questionId, list); }
  for (const question of questions.results as any[]) { const own = grouped.get(question.id) || []; if (own.length !== 4 || own.some((choice, index) => Number(choice.position) !== index || !String(choice.text || "").trim()) || own.filter(choice => Boolean(choice.correct)).length !== 1 || new Set(own.map(choice => normalizeQuestion(choice.text))).size !== 4) return { ok: false as const, error: "invalid_round_choices" }; }
  return { ok: true as const, round };
}
