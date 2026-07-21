CREATE TABLE core_platform_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  event_version INTEGER NOT NULL CHECK (event_version >= 1),
  occurred_at INTEGER NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('auth','game','platform','integration')),
  source_service TEXT NOT NULL,
  source_game_id TEXT,
  source_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  correlation_id TEXT,
  causation_id TEXT,
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted','processing','completed','partial_failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK ((source_kind='game' AND source_game_id IS NOT NULL) OR (source_kind<>'game' AND source_game_id IS NULL))
);

CREATE INDEX core_platform_events_org_time_idx ON core_platform_events(organization_id, occurred_at DESC);
CREATE INDEX core_platform_events_status_time_idx ON core_platform_events(status, updated_at);
CREATE INDEX core_platform_events_user_time_idx ON core_platform_events(user_id, occurred_at DESC);

CREATE TABLE core_platform_event_processing (
  event_id TEXT NOT NULL REFERENCES core_platform_events(event_id) ON DELETE CASCADE,
  consumer_id TEXT NOT NULL,
  handler_version INTEGER NOT NULL CHECK (handler_version >= 1),
  state TEXT NOT NULL CHECK (state IN ('processing','completed','retryable_failed','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
  lease_token TEXT,
  lease_until INTEGER,
  next_attempt_at INTEGER,
  processed_at INTEGER,
  last_error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(event_id, consumer_id, handler_version),
  CHECK ((state='processing' AND lease_token IS NOT NULL AND lease_until IS NOT NULL) OR state<>'processing')
);

CREATE INDEX core_platform_event_processing_retry_idx ON core_platform_event_processing(state, next_attempt_at, lease_until, updated_at);
