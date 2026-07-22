CREATE TABLE platform_achievement_definitions (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'game')),
  game_id TEXT,
  criterion_json TEXT NOT NULL,
  secret INTEGER NOT NULL DEFAULT 0 CHECK (secret IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (code, version),
  CHECK ((scope_type = 'global' AND game_id IS NULL) OR (scope_type = 'game' AND game_id IS NOT NULL))
);

CREATE INDEX platform_achievement_definitions_catalog_idx
ON platform_achievement_definitions(status, scope_type, code, version DESC);

CREATE TABLE user_platform_achievements (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES platform_achievement_definitions(id),
  achievement_code TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  UNIQUE (user_id, achievement_code, scope_key)
);

CREATE INDEX user_platform_achievements_user_time_idx
ON user_platform_achievements(user_id, unlocked_at DESC);

CREATE INDEX user_platform_achievements_org_user_idx
ON user_platform_achievements(organization_id, user_id);
