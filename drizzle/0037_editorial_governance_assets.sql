-- Sprint 24.6: editorial governance and canonical asset registry.
-- `status` remains the publication compatibility flag used by runtime readers.
ALTER TABLE content_items ADD COLUMN editorial_status TEXT NOT NULL DEFAULT 'DRAFT'
  CHECK (editorial_status IN ('DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED'));
ALTER TABLE content_items ADD COLUMN submitted_by TEXT REFERENCES users(id);
ALTER TABLE content_items ADD COLUMN submitted_at INTEGER;
ALTER TABLE content_items ADD COLUMN reviewed_by TEXT REFERENCES users(id);
ALTER TABLE content_items ADD COLUMN reviewed_at INTEGER;
ALTER TABLE content_items ADD COLUMN review_decision TEXT
  CHECK (review_decision IS NULL OR review_decision IN ('APPROVED','CHANGES_REQUESTED'));
ALTER TABLE content_items ADD COLUMN review_comment TEXT;
ALTER TABLE content_items ADD COLUMN rollback_source_version INTEGER
  CHECK (rollback_source_version IS NULL OR rollback_source_version >= 1);

UPDATE content_items SET editorial_status = status;

CREATE INDEX content_items_org_editorial_status_idx
  ON content_items(organization_id, editorial_status, updated_at DESC);

CREATE TABLE content_review_comments (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  content_version INTEGER NOT NULL CHECK (content_version >= 1),
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at INTEGER NOT NULL
);
CREATE INDEX content_review_comments_content_idx
  ON content_review_comments(organization_id, content_id, content_version, created_at);

CREATE TABLE asset_registry (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('IMAGE','ICON','BANNER')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  alt_text TEXT NOT NULL CHECK (length(alt_text) BETWEEN 1 AND 300),
  source_url TEXT NOT NULL,
  source TEXT,
  attribution TEXT,
  license TEXT,
  width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 12000),
  height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 12000),
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size BETWEEN 1 AND 10485760),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX asset_registry_org_status_idx ON asset_registry(organization_id, status, updated_at DESC);
CREATE UNIQUE INDEX asset_registry_org_source_url_uq ON asset_registry(organization_id, source_url);

CREATE TABLE content_assets (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  content_version INTEGER NOT NULL CHECK (content_version >= 1),
  asset_id TEXT NOT NULL REFERENCES asset_registry(id),
  role TEXT NOT NULL CHECK (role IN ('PRIMARY','THUMBNAIL','CLUE','PAIR_A','PAIR_B','BACKGROUND')),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (content_id, content_version, asset_id, role, position)
);
CREATE INDEX content_assets_asset_idx ON content_assets(organization_id, asset_id, content_id);

ALTER TABLE platform_events ADD COLUMN cover_asset_id TEXT REFERENCES asset_registry(id);
