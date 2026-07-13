CREATE TABLE ai_question_suggestions (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id),
  model TEXT NOT NULL,
  request_json TEXT NOT NULL,
  question_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  imported_question_id TEXT REFERENCES question_bank(id),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT REFERENCES users(id)
);
CREATE INDEX ai_suggestions_org_status_idx ON ai_question_suggestions(organization_id,status,created_at DESC);
CREATE INDEX ai_suggestions_daily_idx ON ai_question_suggestions(organization_id,created_at);
