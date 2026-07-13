CREATE TABLE login_security (
  username_hash TEXT PRIMARY KEY NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  first_failed_at INTEGER NOT NULL,
  locked_until INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX login_security_cleanup_idx ON login_security(updated_at);
