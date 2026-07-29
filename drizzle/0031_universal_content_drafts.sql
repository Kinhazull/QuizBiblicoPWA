CREATE TABLE content_items (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN (
    'quiz-biblico',
    'wordle-biblico',
    'associacao-de-temas',
    'linha-do-tempo-biblica',
    'memoria-biblica',
    'quem-sou-eu',
    'jogo-tres-pistas'
  )),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'SPECIAL')),
  biblical_reference TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT NOT NULL,
  reference_json TEXT,
  template_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  author_id TEXT NOT NULL REFERENCES users(id),
  reviewer_id TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER,
  source TEXT NOT NULL DEFAULT 'UNIVERSAL_CMS' CHECK (source = 'UNIVERSAL_CMS'),
  internal_notes TEXT
);

CREATE INDEX content_items_org_updated_idx
  ON content_items(organization_id, updated_at DESC, id);
CREATE INDEX content_items_org_game_updated_idx
  ON content_items(organization_id, game_type, updated_at DESC);
CREATE INDEX content_items_org_status_updated_idx
  ON content_items(organization_id, status, updated_at DESC);
CREATE INDEX content_items_org_difficulty_idx
  ON content_items(organization_id, difficulty);
CREATE INDEX content_items_org_category_idx
  ON content_items(organization_id, category);
CREATE INDEX content_items_org_reference_idx
  ON content_items(organization_id, biblical_reference);

CREATE TABLE content_versions (
  id TEXT PRIMARY KEY NOT NULL,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version >= 1),
  metadata_json TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  changed_by TEXT NOT NULL REFERENCES users(id),
  change_summary TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(content_id, version)
);

CREATE INDEX content_versions_content_version_idx
  ON content_versions(content_id, version DESC);
CREATE INDEX content_versions_org_created_idx
  ON content_versions(organization_id, created_at DESC);
