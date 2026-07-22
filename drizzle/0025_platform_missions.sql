CREATE TABLE platform_mission_definitions (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly')),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'game')),
  game_id TEXT,
  target INTEGER NOT NULL CHECK (target > 0),
  progress_unit TEXT NOT NULL,
  criterion_json TEXT NOT NULL,
  reward_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  available_from INTEGER,
  available_until INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (code, version),
  CHECK ((scope_type = 'global' AND game_id IS NULL) OR (scope_type = 'game' AND game_id IS NOT NULL)),
  CHECK (available_until IS NULL OR available_from IS NULL OR available_until > available_from)
);

CREATE INDEX platform_mission_definitions_catalog_idx
ON platform_mission_definitions(status, cadence, scope_type, code, version DESC);

CREATE TABLE user_platform_missions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL REFERENCES platform_mission_definitions(id),
  mission_code TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly')),
  scope_key TEXT NOT NULL,
  window_key TEXT NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'completed', 'claimed', 'expired')),
  assigned_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER,
  claimed_at INTEGER,
  last_progress_at INTEGER,
  UNIQUE (user_id, mission_code, scope_key, window_key)
);

CREATE INDEX user_platform_missions_current_idx
ON user_platform_missions(user_id, organization_id, cadence, window_key, state);

CREATE INDEX user_platform_missions_expiration_idx
ON user_platform_missions(state, expires_at);

CREATE TABLE user_platform_mission_progress_events (
  id TEXT PRIMARY KEY NOT NULL,
  assignment_id TEXT NOT NULL REFERENCES user_platform_missions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at INTEGER NOT NULL,
  applied_at INTEGER,
  UNIQUE (assignment_id, event_id)
);

CREATE INDEX user_platform_mission_events_assignment_idx
ON user_platform_mission_progress_events(assignment_id, created_at);
