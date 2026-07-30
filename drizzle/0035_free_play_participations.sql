PRAGMA foreign_keys=OFF;

ALTER TABLE generated_game_participation_usage
  RENAME TO generated_game_participation_usage_0034;

ALTER TABLE generated_game_participations
  RENAME TO generated_game_participations_0034;

DROP INDEX generated_game_participations_user_status_idx;

CREATE TABLE generated_game_participations (
  id TEXT PRIMARY KEY NOT NULL,
  selection_id TEXT NOT NULL REFERENCES generated_game_selections(id) ON DELETE RESTRICT,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('DAILY', 'FREE_PLAY')),
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

INSERT INTO generated_game_participations(
  id,selection_id,organization_id,user_id,game_type,mode,status,
  started_at,finished_at,start_event_id,finish_event_id,created_at,updated_at
)
SELECT
  id,selection_id,organization_id,user_id,game_type,mode,status,
  started_at,finished_at,start_event_id,finish_event_id,created_at,updated_at
FROM generated_game_participations_0034;

INSERT INTO generated_game_participation_usage(
  participation_id,organization_id,content_id,content_version,recorded_at
)
SELECT
  participation_id,organization_id,content_id,content_version,recorded_at
FROM generated_game_participation_usage_0034;

DROP TABLE generated_game_participation_usage_0034;
DROP TABLE generated_game_participations_0034;

PRAGMA foreign_keys=ON;
