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
];

export const purgeTables = [
  "platform_statistics_event_checkpoints",
  "core_platform_event_processing",
  "core_platform_events",
  "user_platform_game_difficulty_statistics",
  "user_platform_statistics_active_days",
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
  const deletes = normalized.filter(statement => /^DELETE FROM /i.test(statement));
  if (deletes.length !== purgeTables.length) throw new Error("Reset batch delete list is incomplete or unexpected.");
  for (const table of purgeTables) {
    if (!deletes.includes(`DELETE FROM ${table}`)) throw new Error(`Missing purge statement: ${table}`);
  }
  const updates = normalized.filter(statement => /^UPDATE /i.test(statement));
  if (updates.length !== 1 || updates[0] !== "UPDATE question_bank SET times_used=0") {
    throw new Error("Only question_bank.times_used may be updated during reset.");
  }
  return true;
}
