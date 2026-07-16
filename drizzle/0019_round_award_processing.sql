CREATE TABLE IF NOT EXISTS round_award_processing (
  round_id TEXT PRIMARY KEY NOT NULL REFERENCES rounds(id),
  processed_at INTEGER NOT NULL,
  participant_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS round_award_processing_time_idx ON round_award_processing(processed_at DESC);
