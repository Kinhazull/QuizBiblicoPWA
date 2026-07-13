CREATE TABLE seasons (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed','cancelled')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX seasons_org_period_uq ON seasons(organization_id,year,quarter);
CREATE INDEX seasons_window_idx ON seasons(organization_id,starts_at,ends_at);
ALTER TABLE rounds ADD COLUMN season_id TEXT REFERENCES seasons(id);
ALTER TABLE rounds ADD COLUMN round_type TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE rounds ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rounds ADD COLUMN advanced_rules_json TEXT;
CREATE INDEX rounds_season_idx ON rounds(season_id,opens_at);
CREATE INDEX rounds_type_idx ON rounds(organization_id,round_type,opens_at);
