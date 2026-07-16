CREATE TABLE round_award_participant_processing (
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('close','cancel')),
  processed_at INTEGER NOT NULL,
  PRIMARY KEY (round_id, user_id, job_type)
);

CREATE INDEX round_award_participant_pending_idx
  ON round_award_participant_processing(round_id, job_type, processed_at);
