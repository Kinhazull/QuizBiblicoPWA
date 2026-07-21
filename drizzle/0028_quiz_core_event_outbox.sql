CREATE TABLE quiz_core_event_outbox (
  event_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type = 'GAME_FINISHED'),
  event_version INTEGER NOT NULL CHECK (event_version IN (1, 2)),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL CHECK (game_id = 'quiz-biblico'),
  source_type TEXT NOT NULL CHECK (source_type = 'attempt'),
  source_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  delivery_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_state IN ('pending','processing','delivered','retryable_failed','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at INTEGER,
  processed_at INTEGER,
  last_error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(source_type, source_id, event_type)
);

CREATE INDEX quiz_core_event_outbox_delivery_idx
  ON quiz_core_event_outbox(delivery_state, next_attempt_at, created_at);

CREATE INDEX quiz_core_event_outbox_tenant_idx
  ON quiz_core_event_outbox(organization_id, user_id, created_at DESC);
