CREATE TABLE generated_game_selections (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (
    mode IN ('INTERNAL_TEST', 'DAILY', 'FREE_PLAY', 'EVENT', 'CUSTOM_JOURNEY')
  ),
  selection_key TEXT NOT NULL,
  algorithm_version INTEGER NOT NULL CHECK (algorithm_version >= 1),
  seed_hash TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED')),
  filters_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  UNIQUE(organization_id, game_type, mode, selection_key, algorithm_version)
);

CREATE INDEX generated_game_selections_org_created_idx
  ON generated_game_selections(organization_id, created_at DESC, id);

CREATE INDEX generated_game_selections_mode_key_idx
  ON generated_game_selections(organization_id, mode, selection_key, algorithm_version);

CREATE INDEX generated_game_selections_expiration_idx
  ON generated_game_selections(status, expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TABLE generated_game_selection_items (
  selection_id TEXT NOT NULL REFERENCES generated_game_selections(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  content_version INTEGER NOT NULL CHECK (content_version >= 1),
  position INTEGER NOT NULL CHECK (position >= 1),
  audit_metadata_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (selection_id, position),
  UNIQUE(selection_id, content_id, content_version)
);

CREATE INDEX generated_game_selection_items_content_idx
  ON generated_game_selection_items(organization_id, content_id, content_version);
