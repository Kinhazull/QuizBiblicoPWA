export type ScoringRules = { basePoints: number; speedPointsPerSecond: number; streakBonus: number; minimumCorrectPoints: number };
export const DEFAULT_SCORING_RULES: ScoringRules = { basePoints: 400, speedPointsPerSecond: 40, streakBonus: 100, minimumCorrectPoints: 100 };

export function scoringRules(raw: unknown): ScoringRules {
  const source = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const bounded = (value: unknown, fallback: number, min: number, max: number) => { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.trunc(parsed))) : fallback; };
  return { basePoints: bounded(source.basePoints, 400, 100, 1000), speedPointsPerSecond: bounded(source.speedPointsPerSecond, 40, 0, 100), streakBonus: bounded(source.streakBonus, 100, 0, 300), minimumCorrectPoints: bounded(source.minimumCorrectPoints, 100, 0, 500) };
}

export function calculateAnswerPoints(input: { correct: boolean; elapsedMs: number; secondsPerQuestion: number; currentStreak: number; rules?: Partial<ScoringRules> }) {
  if (!input.correct) return 0;
  const rules = { ...DEFAULT_SCORING_RULES, ...input.rules }, allowedMs = Math.max(1, Math.trunc(input.secondsPerQuestion)) * 1000, elapsed = Math.max(0, Math.min(allowedMs, Math.trunc(input.elapsedMs)));
  const secondsRemaining = Math.max(0, Math.floor((allowedMs - elapsed) / 1000));
  return Math.max(rules.minimumCorrectPoints, rules.basePoints + secondsRemaining * rules.speedPointsPerSecond + Math.max(0, Math.trunc(input.currentStreak)) * rules.streakBonus);
}

export function summarizeAnswers(rows: Array<{ correct: unknown; points: unknown; responseTimeMs?: unknown; response_time_ms?: unknown }>) {
  let score = 0, correctAnswers = 0, totalTimeMs = 0, streak = 0, maxStreak = 0;
  for (const row of rows) { const correct = Boolean(row.correct); score += Math.max(0, Number(row.points) || 0); totalTimeMs += Math.max(0, Number(row.responseTimeMs ?? row.response_time_ms) || 0); if (correct) { correctAnswers++; streak++; maxStreak = Math.max(maxStreak, streak); } else streak = 0; }
  return { score, correctAnswers, totalTimeMs, maxStreak };
}
