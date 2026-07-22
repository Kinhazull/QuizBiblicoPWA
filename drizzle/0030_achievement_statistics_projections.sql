ALTER TABLE user_platform_statistics ADD COLUMN official_games_completed INTEGER NOT NULL DEFAULT 0 CHECK (official_games_completed >= 0);
ALTER TABLE user_platform_statistics ADD COLUMN official_questions_answered INTEGER NOT NULL DEFAULT 0 CHECK (official_questions_answered >= 0);
ALTER TABLE user_platform_statistics ADD COLUMN perfect_games INTEGER NOT NULL DEFAULT 0 CHECK (perfect_games >= 0);
ALTER TABLE user_platform_statistics ADD COLUMN distinct_official_play_days_utc INTEGER NOT NULL DEFAULT 0 CHECK (distinct_official_play_days_utc >= 0);

CREATE TABLE user_platform_statistics_official_days_utc (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  first_completion_at INTEGER NOT NULL,
  last_completion_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, organization_id, day_key)
);

CREATE INDEX user_platform_statistics_official_days_utc_user_idx
  ON user_platform_statistics_official_days_utc(user_id, organization_id, day_key DESC);
