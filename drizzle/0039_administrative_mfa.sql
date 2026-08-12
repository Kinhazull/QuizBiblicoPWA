ALTER TABLE sessions ADD COLUMN mfa_verified INTEGER NOT NULL DEFAULT 0;

CREATE TABLE user_mfa (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active')),
  encrypted_secret TEXT NOT NULL,
  secret_iv TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  enabled_at INTEGER,
  last_totp_step INTEGER,
  requires_enrollment INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE mfa_recovery_codes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX mfa_recovery_codes_user_idx ON mfa_recovery_codes(user_id,used_at);

CREATE TABLE mfa_login_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  persistent INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX mfa_login_challenges_expiry_idx ON mfa_login_challenges(expires_at,used_at);

CREATE UNIQUE INDEX users_one_active_owner_per_org_uq
  ON users(organization_id) WHERE role='owner' AND status='active';
