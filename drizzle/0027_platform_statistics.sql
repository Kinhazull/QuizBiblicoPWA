CREATE TABLE user_platform_statistics (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sessions_completed INTEGER NOT NULL DEFAULT 0 CHECK (sessions_completed >= 0),
  games_used INTEGER NOT NULL DEFAULT 0 CHECK (games_used >= 0),
  total_play_time_ms INTEGER NOT NULL DEFAULT 0 CHECK (total_play_time_ms >= 0),
  timed_sessions INTEGER NOT NULL DEFAULT 0 CHECK (timed_sessions >= 0),
  last_activity_at INTEGER,
  active_days INTEGER NOT NULL DEFAULT 0 CHECK (active_days >= 0),
  current_daily_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_daily_streak >= 0),
  best_daily_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_daily_streak >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, organization_id)
);

CREATE INDEX user_platform_statistics_org_activity_idx
  ON user_platform_statistics(organization_id, last_activity_at DESC);

CREATE TABLE user_platform_game_statistics (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  sessions_started INTEGER NOT NULL DEFAULT 0 CHECK (sessions_started >= 0),
  sessions_completed INTEGER NOT NULL DEFAULT 0 CHECK (sessions_completed >= 0),
  questions_answered INTEGER NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
  correct_answers INTEGER NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
  incorrect_answers INTEGER NOT NULL DEFAULT 0 CHECK (incorrect_answers >= 0),
  best_score INTEGER CHECK (best_score IS NULL OR best_score >= 0),
  total_play_time_ms INTEGER NOT NULL DEFAULT 0 CHECK (total_play_time_ms >= 0),
  timed_sessions INTEGER NOT NULL DEFAULT 0 CHECK (timed_sessions >= 0),
  last_activity_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, organization_id, game_id)
);

CREATE INDEX user_platform_game_statistics_org_game_idx
  ON user_platform_game_statistics(organization_id, game_id, sessions_completed DESC);

CREATE TABLE user_platform_statistics_active_days (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  first_activity_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, organization_id, day_key)
);

CREATE INDEX user_platform_statistics_active_days_user_idx
  ON user_platform_statistics_active_days(user_id, organization_id, day_key DESC);

CREATE TABLE user_platform_game_difficulty_statistics (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  difficulty_key TEXT NOT NULL,
  sessions_completed INTEGER NOT NULL DEFAULT 0 CHECK (sessions_completed >= 0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, organization_id, game_id, difficulty_key)
);

CREATE INDEX user_platform_game_difficulty_statistics_lookup_idx
  ON user_platform_game_difficulty_statistics(user_id, organization_id, game_id, sessions_completed DESC, difficulty_key);

CREATE TABLE platform_statistics_event_checkpoints (
  event_id TEXT NOT NULL REFERENCES core_platform_events(event_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  consumer_version INTEGER NOT NULL CHECK (consumer_version >= 1),
  state TEXT NOT NULL CHECK (state IN ('processing','completed')),
  created_at INTEGER NOT NULL,
  applied_at INTEGER,
  PRIMARY KEY(event_id, consumer_version)
);

CREATE INDEX platform_statistics_event_checkpoints_user_idx
  ON platform_statistics_event_checkpoints(user_id, organization_id, applied_at DESC);
