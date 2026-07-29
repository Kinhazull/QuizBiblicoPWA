CREATE TABLE universal_content_library (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  content_version INTEGER NOT NULL CHECK (content_version >= 1),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'SPECIAL')),
  themes_json TEXT NOT NULL DEFAULT '[]',
  books_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  last_used_at INTEGER,
  last_used_mode TEXT,
  first_published_at INTEGER NOT NULL,
  availability_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    availability_status IN ('AVAILABLE', 'RESERVED_DAILY', 'RESERVED_EVENT', 'ARCHIVED')
  ),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (organization_id, content_id)
);

CREATE INDEX universal_content_library_eligible_idx
  ON universal_content_library(
    organization_id,
    availability_status,
    game_type,
    difficulty,
    priority DESC,
    usage_count,
    first_published_at
  );

CREATE INDEX universal_content_library_publication_idx
  ON universal_content_library(organization_id, first_published_at DESC, content_id);

INSERT INTO universal_content_library(
  organization_id,
  content_id,
  game_type,
  content_version,
  difficulty,
  themes_json,
  books_json,
  tags_json,
  first_published_at,
  availability_status,
  created_at,
  updated_at
)
SELECT
  organization_id,
  id,
  game_type,
  version,
  difficulty,
  json_array(category),
  CASE
    WHEN biblical_reference IS NULL OR trim(biblical_reference) = '' THEN '[]'
    ELSE json_array(biblical_reference)
  END,
  tags_json,
  updated_at,
  'AVAILABLE',
  updated_at,
  updated_at
FROM content_items
WHERE status = 'PUBLISHED';
