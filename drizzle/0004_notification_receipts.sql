CREATE TABLE notification_receipts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  read_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, notification_key)
);
CREATE INDEX notification_receipts_user_idx ON notification_receipts(user_id, read_at DESC);
