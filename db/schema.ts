import { integer, primaryKey, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  createdAt: integer("created_at").notNull(),
});

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("groups_org_idx").on(table.organizationId)]);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  groupId: text("group_id").references(() => groups.id),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  nickname: text("nickname"),
  useNicknameInRanking: integer("use_nickname_in_ranking", { mode: "boolean" }).notNull().default(false),
  profilePublic: integer("profile_public", { mode: "boolean" }).notNull().default(true),
  bio: text("bio"),
  favoriteBook: text("favorite_book"),
  favoriteVerse: text("favorite_verse"),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  role: text("role", { enum: ["admin", "leader", "participant"] }).notNull().default("participant"),
  status: text("status", { enum: ["pending", "active", "suspended", "rejected"] }).notNull().default("pending"),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  approvedAt: integer("approved_at"),
  approvedBy: text("approved_by"),
  lastLoginAt: integer("last_login_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("users_org_username_uq").on(table.organizationId, table.username),
  index("users_status_idx").on(table.organizationId, table.status),
]);

export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  groupId: text("group_id").references(() => groups.id),
  codeHash: text("code_hash").notNull().unique(),
  label: text("label").notNull(),
  approvalRequired: integer("approval_required", { mode: "boolean" }).notNull().default(true),
  maxUses: integer("max_uses"),
  uses: integer("uses").notNull().default(0),
  expiresAt: integer("expires_at"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  persistent: integer("persistent", { mode: "boolean" }).notNull().default(false),
  expiresAt: integer("expires_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
  createdAt: integer("created_at").notNull(),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
}, (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expiry_idx").on(table.expiresAt)]);

export const seasons = sqliteTable("seasons", {
  id: text("id").primaryKey(), organizationId: text("organization_id").notNull().references(() => organizations.id), title: text("title").notNull(), year: integer("year").notNull(), quarter: integer("quarter").notNull(), startsAt: integer("starts_at").notNull(), endsAt: integer("ends_at").notNull(), status: text("status", { enum: ["draft","active","closed","cancelled"] }).notNull().default("draft"), closedAt:integer("closed_at"),snapshotCreatedAt:integer("snapshot_created_at"),createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, (table) => [uniqueIndex("seasons_org_period_uq").on(table.organizationId, table.year, table.quarter)]);

export const rounds = sqliteTable("rounds", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  theme: text("theme").notNull(),
  description: text("description"),
  status: text("status", { enum: ["draft", "scheduled", "active", "closed", "cancelled"] }).notNull().default("draft"),
  opensAt: integer("opens_at").notNull(),
  closesAt: integer("closes_at").notNull(),
  officialAttemptLimit: integer("official_attempt_limit").notNull().default(3),
  secondsPerQuestion: integer("seconds_per_question").notNull().default(20),
  seasonId: text("season_id").references(() => seasons.id),
  roundType: text("round_type", { enum: ["regular", "special"] }).notNull().default("regular"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  advancedRulesJson: text("advanced_rules_json"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("rounds_window_idx").on(table.organizationId, table.opensAt, table.closesAt)]);

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  reference: text("reference"),
  prompt: text("prompt").notNull(),
  commentary: text("commentary"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sourceQuestionId: text("source_question_id").references(() => questionBank.id),
}, (table) => [uniqueIndex("questions_round_position_uq").on(table.roundId, table.position)]);

export const questionBank = sqliteTable("question_bank", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  reference: text("reference"),
  book: text("book"),
  theme: text("theme").notNull(),
  category: text("category"),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).notNull().default("medium"),
  prompt: text("prompt").notNull(),
  normalizedPrompt: text("normalized_prompt").notNull(),
  commentary: text("commentary"),
  status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("active"),
  reviewStatus: text("review_status", { enum: ["draft", "in_review", "approved", "changes_requested"] }).notNull().default("approved"),
  version: integer("version").notNull().default(1),
  updatedBy: text("updated_by").references(() => users.id),
  timesUsed: integer("times_used").notNull().default(0),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("question_bank_org_prompt_uq").on(table.organizationId, table.normalizedPrompt),
  index("question_bank_filters_idx").on(table.organizationId, table.status, table.theme, table.book, table.category, table.difficulty),
]);

export const questionBankChoices = sqliteTable("question_bank_choices", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questionBank.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  text: text("text").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull().default(false),
}, (table) => [uniqueIndex("question_bank_choices_position_uq").on(table.questionId, table.position)]);

export const choices = sqliteTable("choices", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull().default(false),
}, (table) => [index("choices_question_idx").on(table.questionId)]);

export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  roundId: text("round_id").notNull().references(() => rounds.id),
  attemptNumber: integer("attempt_number").notNull(),
  mode: text("mode", { enum: ["official", "practice"] }).notNull().default("official"),
  status: text("status", { enum: ["in_progress", "completed", "abandoned", "invalid"] }).notNull().default("in_progress"),
  shuffleSeed: text("shuffle_seed").notNull(),
  questionOrderJson: text("question_order_json"),
  score: integer("score").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalTimeMs: integer("total_time_ms").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  startedAt: integer("started_at").notNull(),
  completedAt: integer("completed_at"),
}, (table) => [
  uniqueIndex("attempts_user_round_mode_number_uq").on(table.userId, table.roundId, table.mode, table.attemptNumber),
  index("attempts_user_round_mode_status_idx").on(table.userId, table.roundId, table.mode, table.status),
  index("attempts_round_ranking_idx").on(table.roundId, table.status, table.score),
]);

export const attemptAnswers = sqliteTable("attempt_answers", {
  attemptId: text("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull().references(() => questions.id),
  choiceId: text("choice_id").notNull().references(() => choices.id),
  questionOrder: integer("question_order").notNull(),
  choiceOrderJson: text("choice_order_json").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  responseTimeMs: integer("response_time_ms").notNull(),
  points: integer("points").notNull(),
  answeredAt: integer("answered_at").notNull(),
}, (table) => [primaryKey({ columns: [table.attemptId, table.questionId] })]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  detailsJson: text("details_json"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("audit_org_time_idx").on(table.organizationId, table.createdAt)]);

export const userPermissions = sqliteTable("user_permissions", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permissionCode: text("permission_code").notNull(),
  grantedBy: text("granted_by").notNull().references(() => users.id),
  grantedAt: integer("granted_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.permissionCode] })]);

export const userReviewProgress = sqliteTable("user_review_progress", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), questionId: text("question_id").notNull().references(() => questionBank.id, { onDelete: "cascade" }), timesReviewed: integer("times_reviewed").notNull().default(0), lastReviewedAt: integer("last_reviewed_at"), mastered: integer("mastered", { mode: "boolean" }).notNull().default(false),
}, (table) => [primaryKey({ columns: [table.userId, table.questionId] })]);

export const questionRevisions = sqliteTable("question_revisions", {
  id: text("id").primaryKey(), questionId: text("question_id").notNull().references(() => questionBank.id, { onDelete: "cascade" }), version: integer("version").notNull(), snapshotJson: text("snapshot_json").notNull(), changeNote: text("change_note"), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("question_revisions_version_uq").on(table.questionId, table.version)]);

export const abuseCounters = sqliteTable("abuse_counters", {counterKey:text("counter_key").primaryKey(),hits:integer("hits").notNull().default(0),windowStartedAt:integer("window_started_at").notNull(),blockedUntil:integer("blocked_until"),updatedAt:integer("updated_at").notNull()},table=>[index("abuse_counters_cleanup_idx").on(table.updatedAt)]);
export const privacyRequests = sqliteTable("privacy_requests", {id:text("id").primaryKey(),userId:text("user_id").notNull().references(()=>users.id,{onDelete:'cascade'}),organizationId:text("organization_id").notNull().references(()=>organizations.id,{onDelete:'cascade'}),requestType:text("request_type").notNull(),status:text("status").notNull().default('pending'),requestedAt:integer("requested_at").notNull(),resolvedAt:integer("resolved_at"),resolvedBy:text("resolved_by").references(()=>users.id)},table=>[index("privacy_requests_org_status_idx").on(table.organizationId,table.status,table.requestedAt)]);
export const aiQuestionSuggestions = sqliteTable("ai_question_suggestions", {id:text("id").primaryKey(),organizationId:text("organization_id").notNull().references(()=>organizations.id,{onDelete:'cascade'}),requestedBy:text("requested_by").notNull().references(()=>users.id),model:text("model").notNull(),requestJson:text("request_json").notNull(),questionJson:text("question_json").notNull(),status:text("status").notNull().default('suggested'),importedQuestionId:text("imported_question_id").references(()=>questionBank.id),createdAt:integer("created_at").notNull(),reviewedAt:integer("reviewed_at"),reviewedBy:text("reviewed_by").references(()=>users.id)},table=>[index("ai_suggestions_org_status_idx").on(table.organizationId,table.status,table.createdAt)]);
export const batchOperations=sqliteTable("batch_operations",{id:text("id").primaryKey(),organizationId:text("organization_id").notNull().references(()=>organizations.id,{onDelete:'cascade'}),actorUserId:text("actor_user_id").notNull().references(()=>users.id),entityType:text("entity_type").notNull(),action:text("action").notNull(),entityIdsJson:text("entity_ids_json").notNull(),beforeJson:text("before_json").notNull(),afterJson:text("after_json").notNull(),status:text("status").notNull().default('applied'),createdAt:integer("created_at").notNull(),undoneAt:integer("undone_at"),undoneBy:text("undone_by").references(()=>users.id)},table=>[index("batch_operations_org_time_idx").on(table.organizationId,table.createdAt)]);
export const seasonSnapshots=sqliteTable("season_snapshots",{seasonId:text("season_id").notNull().references(()=>seasons.id,{onDelete:'cascade'}),userId:text("user_id").notNull().references(()=>users.id,{onDelete:'cascade'}),position:integer("position").notNull(),score:integer("score").notNull(),roundsPlayed:integer("rounds_played").notNull(),correctAnswers:integer("correct_answers").notNull(),answersTotal:integer("answers_total").notNull(),accuracy:integer("accuracy").notNull(),averageScore:integer("average_score").notNull(),bestScore:integer("best_score").notNull(),improvement:integer("improvement").notNull().default(0),createdAt:integer("created_at").notNull()},table=>[primaryKey({columns:[table.seasonId,table.userId]}),index("season_snapshots_ranking_idx").on(table.seasonId,table.position)]);
export const seasonAwards=sqliteTable("season_awards",{id:text("id").primaryKey(),seasonId:text("season_id").notNull().references(()=>seasons.id,{onDelete:'cascade'}),userId:text("user_id").notNull().references(()=>users.id,{onDelete:'cascade'}),awardCode:text("award_code").notNull(),title:text("title").notNull(),icon:text("icon").notNull(),earnedAt:integer("earned_at").notNull()},table=>[uniqueIndex("season_awards_unique").on(table.seasonId,table.userId,table.awardCode),index("season_awards_user_idx").on(table.userId,table.earnedAt)]);
