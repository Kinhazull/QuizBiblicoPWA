CREATE TABLE batch_operations (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_ids_json TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  created_at INTEGER NOT NULL,
  undone_at INTEGER,
  undone_by TEXT REFERENCES users(id)
);
CREATE INDEX batch_operations_org_time_idx ON batch_operations(organization_id,created_at DESC);
