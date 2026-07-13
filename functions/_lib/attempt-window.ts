export const ATTEMPT_GRACE_MS = 5 * 60 * 1000;
export const START_BUFFER_MS = 30 * 1000;

export function latestAttemptStart(closesAt: number, questionCount: number, secondsPerQuestion: number) {
  return closesAt - (questionCount * secondsPerQuestion * 1000 + START_BUFFER_MS);
}

export function attemptGraceDeadline(closesAt: number) {
  return closesAt + ATTEMPT_GRACE_MS;
}
