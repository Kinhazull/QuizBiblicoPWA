CREATE TABLE platform_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  time_zone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SCHEDULED','ACTIVE','FINISHED','CANCELLED')),
  completion_rule TEXT NOT NULL DEFAULT 'ALL' CHECK(completion_rule IN ('ALL','MINIMUM')),
  minimum_participations INTEGER NOT NULL DEFAULT 1 CHECK(minimum_participations > 0),
  participation_xp INTEGER NOT NULL DEFAULT 0 CHECK(participation_xp BETWEEN 0 AND 100),
  victory_coins INTEGER NOT NULL DEFAULT 0 CHECK(victory_coins BETWEEN 0 AND 20),
  completion_bonus_xp INTEGER NOT NULL DEFAULT 0 CHECK(completion_bonus_xp BETWEEN 0 AND 250),
  perfect_bonus_coins INTEGER NOT NULL DEFAULT 0 CHECK(perfect_bonus_coins BETWEEN 0 AND 50),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  scheduled_at INTEGER,
  cancelled_at INTEGER
);

CREATE INDEX platform_events_org_window_idx
  ON platform_events(organization_id, status, starts_at, ends_at);

CREATE TABLE platform_event_games (
  event_id TEXT NOT NULL REFERENCES platform_events(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  position INTEGER NOT NULL CHECK(position > 0),
  selection_id TEXT REFERENCES generated_game_selections(id) ON DELETE RESTRICT,
  PRIMARY KEY(event_id, game_type),
  UNIQUE(event_id, position),
  UNIQUE(selection_id)
);

CREATE INDEX platform_event_games_org_event_idx
  ON platform_event_games(organization_id, event_id, position);

CREATE TABLE platform_event_content_items (
  event_id TEXT NOT NULL REFERENCES platform_events(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_version INTEGER NOT NULL CHECK(content_version > 0),
  position INTEGER NOT NULL CHECK(position > 0),
  algorithm_version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(event_id, game_type, content_id, content_version),
  UNIQUE(event_id, game_type, position)
);

CREATE INDEX platform_event_content_lookup_idx
  ON platform_event_content_items(organization_id, content_id, content_version);

CREATE TABLE platform_event_content_reservations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES platform_events(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_version INTEGER NOT NULL CHECK(content_version > 0),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  released_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(event_id, content_id, content_version)
);

CREATE INDEX platform_event_reservations_conflict_idx
  ON platform_event_content_reservations(organization_id, content_id, content_version, starts_at, ends_at, released_at);

CREATE TRIGGER platform_event_reservation_no_overlap
BEFORE INSERT ON platform_event_content_reservations
WHEN EXISTS (
  SELECT 1 FROM platform_event_content_reservations existing
  WHERE existing.organization_id = NEW.organization_id
    AND existing.content_id = NEW.content_id
    AND existing.content_version = NEW.content_version
    AND existing.released_at IS NULL
    AND existing.starts_at < NEW.ends_at
    AND existing.ends_at > NEW.starts_at
)
BEGIN
  SELECT RAISE(ABORT, 'event_content_reservation_conflict');
END;

CREATE TABLE platform_event_participations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES platform_events(id) ON DELETE RESTRICT,
  selection_id TEXT NOT NULL REFERENCES generated_game_selections(id) ON DELETE RESTRICT,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK(status IN ('CREATED','STARTED','FINISHED','EXPIRED')),
  outcome TEXT CHECK(outcome IN ('won','lost')),
  started_at INTEGER,
  finished_at INTEGER,
  start_event_id TEXT,
  finish_event_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(event_id, user_id, game_type),
  UNIQUE(selection_id, user_id)
);

CREATE INDEX platform_event_participations_user_idx
  ON platform_event_participations(organization_id, user_id, event_id, status);

CREATE TABLE platform_event_reward_ledger (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES platform_events(id) ON DELETE RESTRICT,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK(reward_type IN ('participation','victory','completion','perfect')),
  xp_amount INTEGER NOT NULL DEFAULT 0,
  coin_amount INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(event_id, user_id, reward_type)
);

CREATE INDEX platform_event_rewards_user_idx
  ON platform_event_reward_ledger(organization_id, user_id, event_id);
