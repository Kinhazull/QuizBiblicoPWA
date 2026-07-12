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
}, (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expiry_idx").on(table.expiresAt)]);

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
  secondsPerQuestion: integer("seconds_per_question").notNull().default(15),
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
}, (table) => [uniqueIndex("questions_round_position_uq").on(table.roundId, table.position)]);

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
  score: integer("score").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalTimeMs: integer("total_time_ms").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  startedAt: integer("started_at").notNull(),
  completedAt: integer("completed_at"),
}, (table) => [
  uniqueIndex("attempts_user_round_number_uq").on(table.userId, table.roundId, table.attemptNumber),
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

