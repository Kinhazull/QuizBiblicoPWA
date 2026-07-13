CREATE TABLE user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL,
  earned_at INTEGER NOT NULL,
  notified_at INTEGER,
  PRIMARY KEY (user_id, badge_code)
);
CREATE INDEX user_badges_earned_idx ON user_badges(user_id, earned_at DESC);
