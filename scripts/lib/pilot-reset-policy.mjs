export const protectedTables = [
  "organizations",
  "groups",
  "users",
  "sessions",
  "legal_consents",
  "account_recovery_codes",
  "user_permissions",
  "privacy_requests",
  "question_bank",
  "question_bank_choices",
  "question_revisions",
  "question_collaborators",
  "audit_logs",
  "d1_migrations",
  "platform_achievement_definitions",
  "platform_mission_definitions",
  "content_items",
  "content_versions",
  "universal_content_library",
  "platform_events",
  "platform_event_games",
  "platform_event_content_items",
  "platform_event_content_reservations",
];

export const purgeTables = [
  "platform_event_reward_ledger",
  "platform_event_participations",
  "generated_game_participation_usage",
  "generated_game_participations",
  "platform_statistics_event_checkpoints",
  "core_platform_event_processing",
  "core_platform_events",
  "user_platform_game_difficulty_statistics",
  "user_platform_statistics_active_days",
  "user_platform_statistics_official_days_utc",
  "user_platform_game_statistics",
  "user_platform_statistics",
  "user_platform_mission_progress_events",
  "user_platform_missions",
  "user_platform_achievements",
  "platform_xp_ledger",
  "platform_coin_ledger",
  "user_platform_progress",
  "attempt_answers",
  "round_award_participant_processing",
  "round_award_processing",
  "round_badge_reconciliations",
  "round_collaborators",
  "attempts",
  "choices",
  "questions",
  "rounds",
  "season_awards",
  "season_snapshots",
  "seasons",
  "user_badges",
  "user_review_progress",
  "notification_receipts",
  "announcements",
  "invitations",
  "ai_question_suggestions",
  "batch_operations",
  "abuse_counters",
  "login_security",
];

export function buildResetBatch() {
  return [
    `INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
     SELECT lower(hex(randomblob(16))),requested.organization_id,NULL,'badge.sync_completed','user',requested.entity_id,
            '{"reason":"pilot_data_reset"}',CAST(strftime('%s','now') AS INTEGER)*1000
       FROM audit_logs requested
      WHERE requested.action='badge.sync_requested'
        AND NOT EXISTS(
          SELECT 1 FROM audit_logs completed
           WHERE completed.action='badge.sync_completed'
             AND completed.entity_id=requested.entity_id
             AND completed.created_at>=requested.created_at
        )
      GROUP BY requested.organization_id,requested.entity_id`,
    ...purgeTables.map(table => `DELETE FROM ${table}`),
    `UPDATE platform_event_content_reservations SET released_at=CAST(strftime('%s','now') AS INTEGER)*1000
      WHERE released_at IS NULL AND (ends_at<=CAST(strftime('%s','now') AS INTEGER)*1000 OR event_id IN (
        SELECT id FROM platform_events WHERE status IN ('FINISHED','CANCELLED')
      ))`,
    `UPDATE universal_content_library SET availability_status='AVAILABLE',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
      WHERE availability_status='RESERVED_EVENT' AND NOT EXISTS(
        SELECT 1 FROM platform_event_content_reservations reservation
        WHERE reservation.organization_id=universal_content_library.organization_id
          AND reservation.content_id=universal_content_library.content_id
          AND reservation.content_version=universal_content_library.content_version
          AND reservation.released_at IS NULL
      )`,
    `DELETE FROM generated_game_selection_items WHERE selection_id IN (
      SELECT id FROM generated_game_selections WHERE mode<>'EVENT'
    )`,
    "DELETE FROM generated_game_selections WHERE mode<>'EVENT'",
    "UPDATE question_bank SET times_used=0",
    `INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
     SELECT lower(hex(randomblob(16))),id,NULL,'production.pilot_data_reset','organization',id,
            '{"preserved":"accounts,question_bank,legal,audit","scope":"competitive_test_data"}',
            CAST(strftime('%s','now') AS INTEGER)*1000
       FROM organizations`,
  ];
}

export function assertResetPolicy(statements = buildResetBatch()) {
  const normalized = statements.map(statement => statement.replace(/\s+/g, " ").trim());
  for (const table of protectedTables) {
    if (normalized.some(statement => new RegExp(`^DELETE FROM ${table}(?:\\s|$)`, "i").test(statement))) {
      throw new Error(`Protected table cannot be deleted: ${table}`);
    }
  }
  const deletes = normalized.filter(statement => /^DELETE FROM [a-z0-9_]+$/i.test(statement));
  if (deletes.length !== purgeTables.length) throw new Error("Reset batch delete list is incomplete or unexpected.");
  for (const table of purgeTables) {
    if (!deletes.includes(`DELETE FROM ${table}`)) throw new Error(`Missing purge statement: ${table}`);
  }
  const allowedUpdates = ["platform_event_content_reservations", "universal_content_library", "question_bank"];
  const updates = normalized.filter(statement => /^UPDATE /i.test(statement));
  if (updates.length !== allowedUpdates.length || updates.some(statement => !allowedUpdates.some(table => new RegExp(`^UPDATE ${table} `, "i").test(statement))))
    throw new Error("Reset batch contains an unexpected update.");
  if (!normalized.some(statement => statement === "DELETE FROM generated_game_selections WHERE mode<>'EVENT'"))
    throw new Error("Generated non-Event selections must be reset.");
  return true;
}
