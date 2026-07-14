import type { AppEnv } from "./auth";
import { QUESTION_COUNT, normalizeQuestion } from "./questions";

export const ROUND_RULES = { questionCount: QUESTION_COUNT, minimumSeconds: 15, maximumSeconds: 60, minimumAttempts: 1, maximumAttempts: 5 } as const;

export function validateRoundConfiguration(input: { opensAt: number; closesAt: number; secondsPerQuestion: number; attemptLimit: number }) {
  if (!Number.isFinite(input.opensAt) || !Number.isFinite(input.closesAt) || input.closesAt <= input.opensAt) return "invalid_schedule";
  if (!Number.isInteger(input.secondsPerQuestion) || input.secondsPerQuestion < ROUND_RULES.minimumSeconds || input.secondsPerQuestion > ROUND_RULES.maximumSeconds) return "invalid_question_time";
  if (!Number.isInteger(input.attemptLimit) || input.attemptLimit < ROUND_RULES.minimumAttempts || input.attemptLimit > ROUND_RULES.maximumAttempts) return "invalid_attempt_limit";
  return null;
}

export async function validateStoredRound(env: AppEnv, roundId: string, organizationId: string, overrides: Partial<{ opensAt: number; closesAt: number; secondsPerQuestion: number; attemptLimit: number; seasonId: string | null }> = {}) {
  const round: any = await env.DB.prepare("SELECT * FROM rounds WHERE id=?1 AND organization_id=?2").bind(roundId, organizationId).first();
  if (!round) return { ok: false as const, error: "not_found" };
  const configurationError = validateRoundConfiguration({ opensAt: overrides.opensAt ?? Number(round.opens_at), closesAt: overrides.closesAt ?? Number(round.closes_at), secondsPerQuestion: overrides.secondsPerQuestion ?? Number(round.seconds_per_question), attemptLimit: overrides.attemptLimit ?? Number(round.official_attempt_limit) });
  if (configurationError) return { ok: false as const, error: configurationError };
  if (round.season_id) { const season = await env.DB.prepare("SELECT id FROM seasons WHERE id=?1 AND organization_id=?2 AND status<>'cancelled'").bind(round.season_id, organizationId).first(); if (!season) return { ok: false as const, error: "invalid_season" }; }
  const questions = await env.DB.prepare("SELECT id,position,prompt,active FROM questions WHERE round_id=?1 ORDER BY position").bind(roundId).all();
  if (questions.results.length !== ROUND_RULES.questionCount || (questions.results as any[]).some((question, index) => !question.active || Number(question.position) !== index + 1)) return { ok: false as const, error: "invalid_round_questions" };
  if (new Set((questions.results as any[]).map(question => normalizeQuestion(question.prompt))).size !== ROUND_RULES.questionCount) return { ok: false as const, error: "duplicate_in_round" };
  const choices = await env.DB.prepare("SELECT c.question_id questionId,c.position,c.text,c.correct FROM choices c JOIN questions q ON q.id=c.question_id WHERE q.round_id=?1 ORDER BY c.question_id,c.position").bind(roundId).all();
  const grouped = new Map<string, any[]>(); for (const choice of choices.results as any[]) { const list = grouped.get(choice.questionId) || []; list.push(choice); grouped.set(choice.questionId, list); }
  for (const question of questions.results as any[]) { const own = grouped.get(question.id) || []; if (own.length !== 4 || own.some((choice, index) => Number(choice.position) !== index || !String(choice.text || "").trim()) || own.filter(choice => Boolean(choice.correct)).length !== 1 || new Set(own.map(choice => normalizeQuestion(choice.text))).size !== 4) return { ok: false as const, error: "invalid_round_choices" }; }
  return { ok: true as const, round };
}
