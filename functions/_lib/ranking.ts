/** Selects one real official attempt per user and round using the competitive tie-break order. */
export const BEST_ATTEMPTS_CTE = `ordered_attempts AS (
  SELECT a.*,
         ROW_NUMBER() OVER (
           PARTITION BY a.round_id,a.user_id
           ORDER BY a.score DESC,a.correct_answers DESC,a.total_time_ms ASC,
                    COALESCE(a.completed_at,9223372036854775807) ASC,a.id ASC
         ) best_attempt_rank
    FROM attempts a
   WHERE a.mode='official' AND a.status='completed'
), best_attempts AS (
  SELECT * FROM ordered_attempts WHERE best_attempt_rank=1
)`;
