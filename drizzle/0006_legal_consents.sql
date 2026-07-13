CREATE TABLE legal_consents (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at INTEGER NOT NULL
);
CREATE INDEX legal_consents_user_idx ON legal_consents(user_id, accepted_at DESC);
