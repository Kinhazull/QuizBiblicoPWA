PRAGMA foreign_keys = ON;

CREATE TABLE organizations (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo', created_at INTEGER NOT NULL);
CREATE TABLE groups (id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
CREATE INDEX groups_org_idx ON groups(organization_id);

CREATE TABLE users (id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL REFERENCES organizations(id), group_id TEXT REFERENCES groups(id), username TEXT NOT NULL, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'participant', status TEXT NOT NULL DEFAULT 'pending', must_change_password INTEGER NOT NULL DEFAULT 0, approved_at INTEGER, approved_by TEXT, last_login_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE UNIQUE INDEX users_org_username_uq ON users(organization_id, username);
CREATE INDEX users_status_idx ON users(organization_id, status);

CREATE TABLE invitations (id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL REFERENCES organizations(id), group_id TEXT REFERENCES groups(id), code_hash TEXT NOT NULL UNIQUE, label TEXT NOT NULL, approval_required INTEGER NOT NULL DEFAULT 1, max_uses INTEGER, uses INTEGER NOT NULL DEFAULT 0, expires_at INTEGER, active INTEGER NOT NULL DEFAULT 1, created_by TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE sessions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL UNIQUE, persistent INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE rounds (id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL REFERENCES organizations(id), title TEXT NOT NULL, theme TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'draft', opens_at INTEGER NOT NULL, closes_at INTEGER NOT NULL, official_attempt_limit INTEGER NOT NULL DEFAULT 3, seconds_per_question INTEGER NOT NULL DEFAULT 15, created_by TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX rounds_window_idx ON rounds(organization_id, opens_at, closes_at);
CREATE TABLE questions (id TEXT PRIMARY KEY NOT NULL, round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE, position INTEGER NOT NULL, reference TEXT, prompt TEXT NOT NULL, commentary TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE UNIQUE INDEX questions_round_position_uq ON questions(round_id, position);
CREATE TABLE choices (id TEXT PRIMARY KEY NOT NULL, question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, text TEXT NOT NULL, correct INTEGER NOT NULL DEFAULT 0);
CREATE INDEX choices_question_idx ON choices(question_id);

CREATE TABLE attempts (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), round_id TEXT NOT NULL REFERENCES rounds(id), attempt_number INTEGER NOT NULL, mode TEXT NOT NULL DEFAULT 'official', status TEXT NOT NULL DEFAULT 'in_progress', shuffle_seed TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, correct_answers INTEGER NOT NULL DEFAULT 0, total_time_ms INTEGER NOT NULL DEFAULT 0, max_streak INTEGER NOT NULL DEFAULT 0, started_at INTEGER NOT NULL, completed_at INTEGER);
CREATE UNIQUE INDEX attempts_user_round_number_uq ON attempts(user_id, round_id, attempt_number);
CREATE INDEX attempts_round_ranking_idx ON attempts(round_id, status, score);
CREATE TABLE attempt_answers (attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE, question_id TEXT NOT NULL REFERENCES questions(id), choice_id TEXT NOT NULL REFERENCES choices(id), question_order INTEGER NOT NULL, choice_order_json TEXT NOT NULL, correct INTEGER NOT NULL, response_time_ms INTEGER NOT NULL, points INTEGER NOT NULL, answered_at INTEGER NOT NULL, PRIMARY KEY(attempt_id, question_id));

CREATE TABLE audit_logs (id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, actor_user_id TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, details_json TEXT, created_at INTEGER NOT NULL);
CREATE INDEX audit_org_time_idx ON audit_logs(organization_id, created_at);
