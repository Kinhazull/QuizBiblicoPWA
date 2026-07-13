CREATE TABLE user_permissions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL,
  granted_by TEXT NOT NULL REFERENCES users(id),
  granted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, permission_code)
);
CREATE INDEX user_permissions_code_idx ON user_permissions(permission_code, user_id);

CREATE TABLE question_collaborators (
  question_id TEXT NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collaboration_role TEXT NOT NULL CHECK (collaboration_role IN ('editor','reviewer')),
  added_by TEXT NOT NULL REFERENCES users(id),
  added_at INTEGER NOT NULL,
  PRIMARY KEY (question_id, user_id)
);

CREATE TABLE question_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX question_revisions_version_uq ON question_revisions(question_id, version);

CREATE TABLE round_collaborators (
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collaboration_role TEXT NOT NULL CHECK (collaboration_role IN ('editor','reviewer')),
  added_by TEXT NOT NULL REFERENCES users(id),
  added_at INTEGER NOT NULL,
  PRIMARY KEY (round_id, user_id)
);

ALTER TABLE question_bank ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE question_bank ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE question_bank ADD COLUMN updated_by TEXT REFERENCES users(id);
UPDATE question_bank SET updated_by=created_by WHERE updated_by IS NULL;
CREATE INDEX question_bank_review_idx ON question_bank(organization_id, review_status, updated_at DESC);
CREATE INDEX audit_entity_idx ON audit_logs(organization_id, entity_type, entity_id, created_at DESC);
