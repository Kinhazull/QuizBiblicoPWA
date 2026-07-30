CREATE TABLE generated_game_participations (
  id TEXT PRIMARY KEY NOT NULL,
  selection_id TEXT NOT NULL REFERENCES generated_game_selections(id) ON DELETE RESTRICT,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode = 'DAILY'),
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (
    status IN ('CREATED', 'STARTED', 'FINISHED', 'EXPIRED')
  ),
  started_at INTEGER,
  finished_at INTEGER,
  start_event_id TEXT,
  finish_event_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(selection_id, user_id)
);

CREATE INDEX generated_game_participations_user_status_idx
  ON generated_game_participations(organization_id, user_id, status, updated_at DESC);

CREATE TABLE generated_game_participation_usage (
  participation_id TEXT NOT NULL REFERENCES generated_game_participations(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  content_version INTEGER NOT NULL CHECK (content_version >= 1),
  recorded_at INTEGER,
  PRIMARY KEY (participation_id, content_id, content_version)
);

