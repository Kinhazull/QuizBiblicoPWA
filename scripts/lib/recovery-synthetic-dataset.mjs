import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const RECOVERY_SYNTHETIC_MANIFEST = Object.freeze({
  schemaVersion: 39,
  organizationId: "recovery-org",
  ownerId: "recovery-owner",
  participantId: "recovery-player",
  contentId: "recovery-content-wordle",
  contentVersion: 1,
  selectionId: "recovery-selection",
  eventId: "recovery-platform-event",
  reservationId: "recovery-reservation",
  outboxEventId: "recovery-outbox-event",
  totalXp: 150,
  coins: 12,
  cmsItems: 1,
  libraryItems: 1,
  outboxState: "pending",
  mfaStatus: "active",
  mfaKeyVersion: 1,
});

const quote = value => value === null ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const row = values => `(${values.map(quote).join(",")})`;

export function buildRecoverySyntheticSql({ migrationsDirectory }) {
  const migrationFiles = readdirSync(migrationsDirectory).filter(name => name.endsWith(".sql")).sort();
  if (migrationFiles.length !== 40 || migrationFiles.at(-1) !== "0039_administrative_mfa.sql") {
    throw new Error("recovery_schema_must_end_at_0039");
  }
  const migrationSql = migrationFiles.map(name => `-- MIGRATION ${name}\n${readFileSync(join(migrationsDirectory, name), "utf8").trim()}`).join("\n\n");
  const m = RECOVERY_SYNTHETIC_MANIFEST;
  const timestamp = 1_800_000_000_000;
  const inserts = [
    "-- SYNTHETIC RECOVERY DATA ONLY. Contains no production data or usable secrets.",
    "CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
    `INSERT INTO d1_migrations(name,applied_at) VALUES ${migrationFiles.map(name => row([name, "2026-08-12T00:00:00.000Z"])).join(",")};`,
    `INSERT INTO organizations(id,name,slug,timezone,created_at) VALUES ${row([m.organizationId, "Synthetic Recovery Organization", "recovery-org", "America/Sao_Paulo", timestamp])};`,
    `INSERT INTO groups(id,organization_id,name,active,created_at) VALUES ${row(["recovery-group", m.organizationId, "Synthetic Recovery Group", 1, timestamp])};`,
    `INSERT INTO users(id,organization_id,group_id,username,display_name,password_hash,password_salt,role,status,must_change_password,approved_at,created_at,updated_at) VALUES ${row([m.ownerId,m.organizationId,"recovery-group","recovery-owner","Synthetic Recovery Owner","SYNTHETIC_DISABLED_CREDENTIAL","SYNTHETIC_DISABLED_SALT","owner","active",1,timestamp,timestamp,timestamp])},${row([m.participantId,m.organizationId,"recovery-group","recovery-player","Synthetic Recovery Player","SYNTHETIC_DISABLED_CREDENTIAL","SYNTHETIC_DISABLED_SALT","participant","active",1,timestamp,timestamp,timestamp])};`,
    `INSERT INTO content_items(id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,payload_json,version,author_id,created_at,updated_at,source,editorial_status) VALUES ${row([m.contentId,m.organizationId,"wordle-biblico","PUBLISHED","Synthetic Recovery","EASY","Jo 1:1",'["synthetic-recovery"]','{"word":"TESTE","hint":"Conteúdo exclusivamente sintético"}',m.contentVersion,m.ownerId,timestamp,timestamp,"UNIVERSAL_CMS","PUBLISHED"])};`,
    `INSERT INTO content_versions(id,content_id,organization_id,version,metadata_json,payload_json,changed_by,change_summary,created_at) VALUES ${row(["recovery-content-version",m.contentId,m.organizationId,m.contentVersion,'{"category":"Synthetic Recovery","difficulty":"EASY"}','{"word":"TESTE","hint":"Conteúdo exclusivamente sintético"}',m.ownerId,"Synthetic recovery fixture",timestamp])};`,
    `INSERT INTO universal_content_library(organization_id,content_id,game_type,content_version,difficulty,themes_json,books_json,tags_json,priority,usage_count,last_used_at,last_used_mode,first_published_at,availability_status,created_at,updated_at) VALUES ${row([m.organizationId,m.contentId,"wordle-biblico",m.contentVersion,"EASY",'["Synthetic Recovery"]','["João"]','["synthetic-recovery"]',0,1,timestamp,"EVENT",timestamp,"RESERVED_EVENT",timestamp,timestamp])};`,
    `INSERT INTO generated_game_selections(id,organization_id,requested_by_user_id,game_type,mode,selection_key,algorithm_version,seed_hash,request_fingerprint,status,filters_json,created_at,expires_at) VALUES ${row([m.selectionId,m.organizationId,m.participantId,"wordle-biblico","EVENT","recovery-event-selection",1,"synthetic-seed-hash","synthetic-request-fingerprint","ACTIVE","{}",timestamp,timestamp+86400000])};`,
    `INSERT INTO generated_game_selection_items(selection_id,organization_id,content_id,content_version,position,audit_metadata_json,created_at) VALUES ${row([m.selectionId,m.organizationId,m.contentId,m.contentVersion,1,'{"source":"SYNTHETIC_RECOVERY"}',timestamp])};`,
    `INSERT INTO platform_events(id,organization_id,title,description,starts_at,ends_at,time_zone,status,completion_rule,minimum_participations,created_by,created_at,updated_at,scheduled_at) VALUES ${row([m.eventId,m.organizationId,"Synthetic Recovery Event","Recovery validation only",timestamp-3600000,timestamp+86400000,"America/Sao_Paulo","SCHEDULED","ALL",1,m.ownerId,timestamp,timestamp,timestamp])};`,
    `INSERT INTO platform_event_games(event_id,organization_id,game_type,position,selection_id) VALUES ${row([m.eventId,m.organizationId,"wordle-biblico",1,m.selectionId])};`,
    `INSERT INTO platform_event_content_items(event_id,organization_id,game_type,content_id,content_version,position,algorithm_version) VALUES ${row([m.eventId,m.organizationId,"wordle-biblico",m.contentId,m.contentVersion,1,1])};`,
    `INSERT INTO platform_event_content_reservations(id,event_id,organization_id,content_id,content_version,starts_at,ends_at,created_at) VALUES ${row([m.reservationId,m.eventId,m.organizationId,m.contentId,m.contentVersion,timestamp-3600000,timestamp+86400000,timestamp])};`,
    `INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES ${row([m.participantId,m.organizationId,m.totalXp,m.coins,timestamp,timestamp])};`,
    `INSERT INTO quiz_core_event_outbox(event_id,event_type,event_version,organization_id,user_id,game_id,source_type,source_id,payload_json,envelope_json,delivery_state,attempt_count,created_at,updated_at) VALUES ${row([m.outboxEventId,"GAME_FINISHED",2,m.organizationId,m.participantId,"quiz-biblico","attempt","recovery-attempt",'{}','{}',m.outboxState,0,timestamp,timestamp])};`,
    `INSERT INTO user_mfa(user_id,status,encrypted_secret,secret_iv,key_version,enabled_at,last_totp_step,requires_enrollment,created_at,updated_at) VALUES ${row([m.ownerId,m.mfaStatus,"SYNTHETIC_NON_SECRET_CIPHERTEXT","SYNTHETIC_NON_SECRET_IV",m.mfaKeyVersion,timestamp,1,0,timestamp,timestamp])};`,
  ];
  return `-- Conte os Feitos: deterministic synthetic recovery dump through migration 0039.\nPRAGMA foreign_keys=ON;\n\n${migrationSql}\n\n${inserts.join("\n")}\n`;
}
