ALTER TABLE attempts ADD COLUMN resumed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attempts ADD COLUMN last_resumed_at INTEGER;
CREATE INDEX attempts_continuity_idx ON attempts(status, resumed_count, started_at);
