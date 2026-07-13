ALTER TABLE sessions ADD COLUMN user_agent TEXT;
ALTER TABLE sessions ADD COLUMN ip_hash TEXT;

CREATE TABLE abuse_counters (
  counter_key TEXT PRIMARY KEY NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX abuse_counters_cleanup_idx ON abuse_counters(updated_at);

CREATE TABLE privacy_requests (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT REFERENCES users(id)
);
CREATE INDEX privacy_requests_org_status_idx ON privacy_requests(organization_id,status,requested_at);
