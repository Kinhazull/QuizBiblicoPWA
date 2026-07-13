ALTER TABLE seasons ADD COLUMN closed_at INTEGER;
ALTER TABLE seasons ADD COLUMN snapshot_created_at INTEGER;
CREATE TABLE season_snapshots (season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,position INTEGER NOT NULL,score INTEGER NOT NULL,rounds_played INTEGER NOT NULL,correct_answers INTEGER NOT NULL,answers_total INTEGER NOT NULL,accuracy REAL NOT NULL,average_score INTEGER NOT NULL,best_score INTEGER NOT NULL,improvement INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,PRIMARY KEY(season_id,user_id));
CREATE INDEX season_snapshots_ranking_idx ON season_snapshots(season_id,position);
CREATE TABLE season_awards (id TEXT PRIMARY KEY NOT NULL,season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,award_code TEXT NOT NULL,title TEXT NOT NULL,icon TEXT NOT NULL,earned_at INTEGER NOT NULL,UNIQUE(season_id,user_id,award_code));
CREATE INDEX season_awards_user_idx ON season_awards(user_id,earned_at DESC);
