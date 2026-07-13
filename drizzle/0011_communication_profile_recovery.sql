ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN favorite_book TEXT;
ALTER TABLE users ADD COLUMN favorite_verse TEXT;

CREATE TABLE announcements (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  priority TEXT NOT NULL DEFAULT 'normal',
  publish_at INTEGER NOT NULL,
  expires_at INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX announcements_active_idx ON announcements(organization_id,active,publish_at,expires_at);

CREATE TABLE account_recovery_codes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX recovery_codes_user_idx ON account_recovery_codes(user_id,used_at);
