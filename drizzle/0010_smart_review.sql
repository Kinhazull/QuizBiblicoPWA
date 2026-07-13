CREATE TABLE user_review_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  times_reviewed INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at INTEGER,
  mastered INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX user_review_due_idx ON user_review_progress(user_id,mastered,last_reviewed_at);
