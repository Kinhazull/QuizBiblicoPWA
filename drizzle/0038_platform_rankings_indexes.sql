-- Read-only Ranking Universal access paths plus the normalized per-game projection.
ALTER TABLE user_platform_game_statistics
  ADD COLUMN best_normalized_performance INTEGER
  CHECK (best_normalized_performance IS NULL OR (best_normalized_performance >= 0 AND best_normalized_performance <= 100));

CREATE INDEX user_platform_progress_org_ranking_idx
  ON user_platform_progress(organization_id, total_xp DESC, created_at ASC, user_id);

CREATE INDEX platform_xp_ledger_org_applied_user_idx
  ON platform_xp_ledger(organization_id, applied_at, user_id);

CREATE INDEX user_platform_game_statistics_org_game_score_idx
  ON user_platform_game_statistics(organization_id, game_id, best_score DESC, sessions_completed DESC, updated_at ASC, user_id);

CREATE INDEX user_platform_game_statistics_org_game_performance_idx
  ON user_platform_game_statistics(organization_id, game_id, best_normalized_performance DESC, sessions_completed DESC, updated_at ASC, user_id);
