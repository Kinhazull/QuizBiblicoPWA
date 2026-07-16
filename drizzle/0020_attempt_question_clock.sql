ALTER TABLE attempts ADD COLUMN current_question_started_at INTEGER;

CREATE TABLE round_badge_reconciliations (
  round_id TEXT PRIMARY KEY NOT NULL REFERENCES rounds(id),
  reconciled_at INTEGER NOT NULL
);
