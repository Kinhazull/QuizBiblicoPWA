export const OPERATIONAL_SCHEMA_VERSION = 36;
export const EXPECTED_MIGRATION_COUNT = 37;

export const APPLICATION_TABLES = Object.freeze([
  "organizations", "groups", "users", "invitations", "sessions", "rounds", "questions", "choices", "attempts",
  "attempt_answers", "audit_logs", "login_security", "user_badges", "notification_receipts", "legal_consents",
  "question_bank", "question_bank_choices", "user_permissions", "question_collaborators", "question_revisions",
  "round_collaborators", "seasons", "user_review_progress", "announcements", "account_recovery_codes",
  "abuse_counters", "privacy_requests", "ai_question_suggestions", "batch_operations", "season_snapshots",
  "season_awards", "round_award_processing", "round_badge_reconciliations", "round_award_participant_processing",
  "user_platform_progress", "platform_xp_ledger", "platform_coin_ledger", "platform_achievement_definitions",
  "user_platform_achievements", "platform_mission_definitions", "user_platform_missions",
  "user_platform_mission_progress_events", "core_platform_events", "core_platform_event_processing",
  "content_items", "content_versions", "universal_content_library", "generated_game_selections",
  "generated_game_selection_items", "generated_game_participations", "generated_game_participation_usage",
  "platform_events", "platform_event_games", "platform_event_content_items", "platform_event_content_reservations",
  "platform_event_participations", "platform_event_reward_ledger", "user_platform_statistics",
  "user_platform_game_statistics", "user_platform_game_difficulty_statistics", "user_platform_statistics_active_days",
  "platform_statistics_event_checkpoints", "quiz_core_event_outbox", "user_platform_statistics_official_days_utc",
]);

export const CRITICAL_INDEXES = Object.freeze([
  "choices_question_position_uq", "attempt_answers_order_uq", "attempts_user_round_mode_number_uq",
  "questions_round_source_uq", "round_award_processing_time_idx", "round_award_participant_pending_idx",
  "audit_action_entity_time_idx",
  "user_platform_progress_org_user_idx", "platform_xp_ledger_user_time_idx", "platform_coin_ledger_user_time_idx",
  "platform_achievement_definitions_catalog_idx", "user_platform_achievements_org_user_idx",
  "platform_mission_definitions_catalog_idx", "user_platform_missions_current_idx",
  "core_platform_event_processing_retry_idx", "user_platform_statistics_org_activity_idx",
  "platform_statistics_event_checkpoints_user_idx", "quiz_core_event_outbox_delivery_idx",
  "quiz_core_event_outbox_claim_idx", "user_platform_statistics_official_days_utc_user_idx",
  "universal_content_library_eligible_idx", "universal_content_library_publication_idx",
  "generated_game_selections_org_created_idx", "generated_game_selections_mode_key_idx",
  "generated_game_selections_expiration_idx", "generated_game_selection_items_content_idx",
  "generated_game_participations_user_status_idx", "platform_events_org_window_idx",
  "platform_event_games_org_event_idx", "platform_event_content_lookup_idx",
  "platform_event_reservations_conflict_idx", "platform_event_participations_user_idx",
  "platform_event_rewards_user_idx",
  "rounds_window_idx", "user_platform_achievements_user_time_idx", "user_platform_missions_expiration_idx",
  "user_platform_mission_events_assignment_idx", "core_platform_events_org_time_idx",
  "core_platform_events_status_time_idx", "core_platform_events_user_time_idx",
  "user_platform_game_statistics_org_game_idx", "user_platform_statistics_active_days_user_idx",
  "user_platform_game_difficulty_statistics_lookup_idx",
]);

export const CRITICAL_TRIGGERS = Object.freeze(["choices_fill_position_after_insert", "platform_event_reservation_no_overlap"]);

const security = new Set(["sessions", "login_security", "account_recovery_codes", "abuse_counters"]);
const operational = new Set(["quiz_core_event_outbox"]);
export const BACKUP_TABLE_CLASSIFICATION = Object.freeze(Object.fromEntries(APPLICATION_TABLES.map(table => [table,
  security.has(table) ? "SECRET_OR_SECURITY" : operational.has(table) ? "OPERATIONAL_ONLY" : "INCLUDED",
])));

const preserve = new Set(["organizations", "groups", "users", "invitations", "legal_consents", "question_bank",
  "question_bank_choices", "question_collaborators", "question_revisions", "content_items", "content_versions",
  "platform_achievement_definitions", "platform_mission_definitions", "audit_logs",
  "platform_events", "platform_event_games", "platform_event_content_items"]);
const securityPreserve = new Set(["sessions", "login_security", "account_recovery_codes", "abuse_counters", "user_permissions", "privacy_requests"]);
export const RESET_TABLE_CLASSIFICATION = Object.freeze(Object.fromEntries(APPLICATION_TABLES.map(table => [table,
  preserve.has(table) ? "PRESERVE" : securityPreserve.has(table) ? "SECURITY_PRESERVE" :
    ["ai_question_suggestions", "batch_operations"].includes(table) ? "LEGACY_PRESERVE" :
    ["universal_content_library"].includes(table) ? "DERIVED" :
    ["generated_game_selections", "generated_game_selection_items", "platform_event_content_reservations"].includes(table) ? "REBUILD" : "RESET",
])));

const directPersonal = new Set(["users", "invitations", "sessions", "legal_consents", "account_recovery_codes", "privacy_requests"]);
const indirectPersonal = new Set([
  "attempts", "attempt_answers", "audit_logs", "login_security", "user_badges", "notification_receipts",
  "user_permissions", "question_collaborators", "question_revisions", "round_collaborators", "user_review_progress",
  "season_awards", "round_award_processing", "round_badge_reconciliations", "round_award_participant_processing",
  "user_platform_progress", "platform_xp_ledger", "platform_coin_ledger", "user_platform_achievements",
  "user_platform_missions", "user_platform_mission_progress_events", "core_platform_events",
  "core_platform_event_processing", "generated_game_selections", "generated_game_participations",
  "generated_game_participation_usage", "platform_event_participations", "platform_event_reward_ledger",
  "user_platform_statistics", "user_platform_game_statistics", "user_platform_game_difficulty_statistics",
  "user_platform_statistics_active_days", "platform_statistics_event_checkpoints", "quiz_core_event_outbox",
  "user_platform_statistics_official_days_utc",
]);
const editorial = new Set([
  "rounds", "questions", "choices", "question_bank", "question_bank_choices", "question_collaborators",
  "question_revisions", "round_collaborators", "seasons", "announcements", "ai_question_suggestions",
  "batch_operations", "content_items", "content_versions", "universal_content_library", "platform_events",
  "platform_event_games", "platform_event_content_items", "platform_event_content_reservations",
]);
const securityData = new Set(["sessions", "login_security", "audit_logs", "account_recovery_codes", "abuse_counters"]);
const virtualEconomy = new Set(["user_platform_progress", "platform_xp_ledger", "platform_coin_ledger", "platform_event_reward_ledger"]);
const idempotency = new Set([
  "platform_xp_ledger", "platform_coin_ledger", "user_platform_mission_progress_events", "core_platform_events",
  "core_platform_event_processing", "platform_statistics_event_checkpoints", "quiz_core_event_outbox",
  "generated_game_selections", "generated_game_participations", "generated_game_participation_usage",
  "platform_event_participations", "platform_event_reward_ledger",
]);
const organizationOwned = new Set([
  "organizations", "groups", "rounds", "questions", "choices", "question_bank", "question_bank_choices",
  "seasons", "announcements", "platform_achievement_definitions", "platform_mission_definitions",
  "content_items", "content_versions", "universal_content_library", "generated_game_selection_items",
  "platform_events", "platform_event_games", "platform_event_content_items", "platform_event_content_reservations",
]);

export const PRIVACY_TABLE_CLASSIFICATION = Object.freeze(Object.fromEntries(APPLICATION_TABLES.map(table => {
  const categories = [];
  if (directPersonal.has(table)) categories.push("DIRECT_PERSONAL");
  if (indirectPersonal.has(table)) categories.push("INDIRECT_OR_PSEUDONYMOUS");
  if (editorial.has(table)) categories.push("EDITORIAL");
  if (securityData.has(table)) categories.push("SECURITY");
  if (virtualEconomy.has(table)) categories.push("VIRTUAL_ECONOMY");
  if (idempotency.has(table)) categories.push("IDEMPOTENCY");
  if (organizationOwned.has(table)) categories.push("ORGANIZATION_OWNED");
  if (!categories.length) categories.push("OPERATIONAL_OR_HISTORICAL");

  let lifecycle = "PRESERVE";
  if (organizationOwned.has(table)) lifecycle = "ORGANIZATION_OWNED";
  else if (["sessions", "account_recovery_codes", "user_permissions"].includes(table)) lifecycle = "DELETE";
  else if (securityData.has(table)) lifecycle = "PRESERVE_FOR_SECURITY";
  else if (idempotency.has(table)) lifecycle = "PRESERVE_FOR_IDEMPOTENCY";
  else if (directPersonal.has(table) || indirectPersonal.has(table)) lifecycle = "ANONYMIZE";
  return [table, Object.freeze({ categories: Object.freeze(categories), lifecycle, exportable: directPersonal.has(table) || indirectPersonal.has(table) })];
})));

for (const contract of [BACKUP_TABLE_CLASSIFICATION, RESET_TABLE_CLASSIFICATION, PRIVACY_TABLE_CLASSIFICATION]) {
  const missing = APPLICATION_TABLES.filter(table => !contract[table]);
  if (missing.length) throw new Error(`operational_schema_contract_incomplete:${missing.join(",")}`);
}
