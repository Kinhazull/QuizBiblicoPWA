import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("melhor tentativa é centralizada e preserva uma linha real", async () => {
  const source = await read("functions/_lib/ranking.ts");
  assert.match(source, /ROW_NUMBER\(\) OVER/);
  assert.match(source, /PARTITION BY a\.round_id,a\.user_id/);
  assert.match(source, /a\.score DESC,a\.correct_answers DESC,a\.total_time_ms ASC/);
  assert.doesNotMatch(source, /MAX\(a\.score\).*MAX\(a\.correct_answers\)/s);
});

test("Worker histórico executa somente operações modernas da plataforma", async () => {
  const [worker, config, processor, migration] = await Promise.all([
    read("workers/journey-awards/index.ts"),
    read("workers/journey-awards/wrangler.jsonc"),
    read("functions/_lib/round-awards.ts"),
    read("drizzle/0019_round_award_processing.sql"),
  ]);
  assert.match(worker, /async scheduled/);
  assert.doesNotMatch(worker, /processClosedRoundAwards|journey_awards/);
  assert.match(worker, /dispatchQuizOutbox/);
  assert.match(worker, /retryOfficialCoreEvents/);
  assert.match(worker, /operationalLog\(\{ level: "info", operation: item\.operation/);
  assert.match(worker, /createSupportId\(\)/);
  assert.match(worker, /scheduled_cycle/);
  assert.match(worker, /alertSink\.send/);
  assert.match(worker, /Platform scheduled worker is active/);
  assert.match(config, /"crons": \["\* \* \* \* \*"\]/);
  assert.match(config, /"binding": "DB"/);
  assert.match(config, /"database_name": "quiz-biblico-db"/);
  assert.match(processor, /INSERT OR IGNORE INTO round_award_processing/);
  assert.match(migration, /round_id TEXT PRIMARY KEY/);
});

test("push valida e empacota, mas promoção de Pages e Worker é manual e vinculada ao SHA", async () => {
  const [workflow, promotion, pkg, migration] = await Promise.all([
    read(".github/workflows/quality-security.yml"),
    read(".github/workflows/promote-production.yml"),
    read("package.json"),
    read("drizzle/0019_round_award_processing.sql"),
  ]);
  assert.doesNotMatch(workflow, /wrangler pages deploy/);
  assert.doesNotMatch(workflow, /worker:awards:deploy/);
  assert.match(workflow, /pnpm run test:all/);
  assert.match(workflow, /pnpm run typecheck/);
  assert.match(workflow, /worker:awards:types:check && pnpm run worker:awards:check/);
  assert.match(workflow, /build:pages-functions/);
  assert.match(workflow, /\.pages-functions\/index\.js/);
  assert.match(workflow, /test ! -e out\/_worker\.js/);
  assert.match(workflow, /cp \.pages-functions\/index\.js verified-release\/out\/_worker\.js/);
  assert.match(workflow, /cd verified-release && sha256sum out\/_worker\.js > pages-functions\.sha256/);
  assert.match(workflow, /verify:pages-release-artifact -- verified-release\/out/);
  assert.match(workflow, /source-sha\.txt/);
  assert.match(workflow, /retention-days: 14/);
  assert.match(promotion, /workflow_dispatch:/);
  assert.doesNotMatch(promotion, /\n  push:/);
  assert.match(promotion, /PROMOVER_PRODUCAO/);
  assert.match(promotion, /quality_run_id/);
  assert.match(promotion, /\/actions\/runs\/<ID>/);
  assert.match(promotion, /git merge-base --is-ancestor/);
  assert.match(promotion, /source-sha\.txt/);
  assert.match(promotion, /test -s verified-release\/out\/_worker\.js/);
  assert.match(promotion, /verify:pages-release-artifact -- verified-release\/out/);
  assert.match(promotion, /verify:pages-critical-routes -- \"\$deployment_url\"/);
  assert.doesNotMatch(promotion, /CONFIGURAR AUTENTICADOR/);
  assert.match(promotion, /cd verified-release && sha256sum -c pages-functions\.sha256/);
  assert.doesNotMatch(promotion, /build:pages-functions/);
  assert.match(promotion, /worker:awards:types:check && pnpm run worker:awards:check/);
  const workerPreflight = promotion.indexOf("Validate Worker before any production deploy");
  const pagesDeploy = promotion.indexOf("wrangler pages deploy");
  const workerDeploy = promotion.indexOf("worker:awards:deploy");
  assert.ok(workerPreflight >= 0 && pagesDeploy > workerPreflight && workerDeploy > pagesDeploy);
  assert.match(promotion, /Uploading \(Functions\|Worker\) bundle/);
  assert.match(promotion, /\/api\/auth\/me/);
  assert.match(promotion, /production_deployments_enabled/);
  assert.match(promotion, /db:reconcile-migrations:verify-final/);
  assert.match(promotion, /verified-release\/out/);
  assert.doesNotMatch(workflow, /worker:awards:migrate/);
  assert.doesNotMatch(workflow, /db:reconcile-migrations:apply/);
  assert.doesNotMatch(promotion, /worker:awards:migrate/);
  assert.doesNotMatch(promotion, /db:reconcile-migrations:apply/);
  assert.match(promotion, /pnpm run worker:awards:deploy/);
  assert.match(pkg, /worker:awards:check/);
  assert.match(pkg, /"typecheck": "tsc --noEmit --incremental false"/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS/);
});

test("reconciliação é manual, confirmada, precedida por backup e não faz deploy", async () => {
  const [workflow, script, schemaContract, docs] = await Promise.all([
    read(".github/workflows/reconcile-production-d1.yml"),
    read("scripts/reconcile-d1-migrations.mjs"),
    read("shared/operational-schema-contract.mjs"),
    read("docs/D1_MIGRATION_RECONCILIATION.md"),
  ]);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.doesNotMatch(workflow, /\n  pull_request:/);
  assert.match(workflow, /RECONCILIAR_MIGRATIONS_PRODUCAO/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /d1 export quiz-biblico-db --remote/);
  assert.match(workflow, /openssl enc -aes-256-cbc -pbkdf2/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  const dryRun = workflow.indexOf("db:reconcile-migrations:verify-promotable");
  const backup = workflow.indexOf("d1 export quiz-biblico-db");
  const apply = workflow.indexOf("worker:awards:migrate");
  assert.ok(dryRun >= 0 && backup > dryRun && apply > backup);
  assert.doesNotMatch(workflow, /db:reconcile-migrations:apply/);
  assert.doesNotMatch(workflow, /db:reconcile-migrations:verify-pending/);
  assert.match(workflow, /worker:awards:migrate/);
  assert.match(workflow, /db:reconcile-migrations:verify-final/);
  assert.match(workflow, /db:reconcile-migrations:compare/);
  assert.doesNotMatch(workflow, /worker:awards:deploy/);
  assert.match(script, /Unsafe migration ledger state/);
  assert.match(script, /validateMigration0021/);
  assert.match(script, /validateMigration0022/);
  assert.match(script, /0023_platform_user_progress\.sql/);
  assert.match(script, /0030_achievement_statistics_projections\.sql/);
  assert.match(script, /0031_universal_content_drafts\.sql/);
  assert.match(script, /assertMigrationLedgerPrefix/);
  assert.match(script, /foundationMigrations/);
  assert.match(script, /expectedFinalLedger\.length/);
  assert.match(script, /quiz_core_event_outbox_claim_idx/);
  assert.match(schemaContract, /distinct_official_play_days_utc/);
  assert.match(script, /assertExactNames\(ledgerNames\(\), expectedFinalLedger/);
  assert.match(docs, /Actions/);
});
