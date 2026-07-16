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

test("Worker separado possui fechamento automático idempotente configurado", async () => {
  const [worker, config, processor, migration] = await Promise.all([
    read("workers/journey-awards/index.ts"),
    read("workers/journey-awards/wrangler.jsonc"),
    read("functions/_lib/round-awards.ts"),
    read("drizzle/0019_round_award_processing.sql"),
  ]);
  assert.match(worker, /async scheduled/);
  assert.match(worker, /processClosedRoundAwards/);
  assert.match(worker, /Journey awards worker is active/);
  assert.match(config, /"crons": \["\* \* \* \* \*"\]/);
  assert.match(config, /"binding": "DB"/);
  assert.match(config, /"database_name": "quiz-biblico-db"/);
  assert.match(processor, /INSERT OR IGNORE INTO round_award_processing/);
  assert.match(migration, /round_id TEXT PRIMARY KEY/);
});

test("pipeline publica Pages e Worker somente após qualidade e nunca altera migrations no push", async () => {
  const [workflow, pkg, migration] = await Promise.all([
    read(".github/workflows/quality-security.yml"),
    read("package.json"),
    read("drizzle/0019_round_award_processing.sql"),
  ]);
  assert.match(workflow, /deploy-journey-awards:/);
  assert.match(workflow, /deploy-pages:/);
  assert.match(workflow, /needs: \[quality, browser-smoke, deploy-pages\]/);
  assert.match(workflow, /wrangler pages deploy out/);
  assert.match(workflow, /build:pages-functions/);
  assert.match(workflow, /\.pages-functions\/index\.js/);
  assert.match(workflow, /test ! -e out\/_worker\.js/);
  assert.match(workflow, /Uploading Functions bundle/);
  assert.match(workflow, /\/api\/auth\/me: HTTP/);
  assert.match(workflow, /production_deployments_enabled/);
  assert.match(workflow, /github\.event_name == 'push'/);
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /db:reconcile-migrations:verify-final/);
  assert.doesNotMatch(workflow, /worker:awards:migrate/);
  assert.doesNotMatch(workflow, /db:reconcile-migrations:apply/);
  assert.match(workflow, /pnpm run worker:awards:deploy/);
  assert.match(pkg, /worker:awards:check/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS/);
});

test("reconciliação é manual, confirmada, precedida por backup e não faz deploy", async () => {
  const [workflow, script, docs] = await Promise.all([
    read(".github/workflows/reconcile-production-d1.yml"),
    read("scripts/reconcile-d1-migrations.mjs"),
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
  const dryRun = workflow.indexOf("db:reconcile-migrations\n");
  const backup = workflow.indexOf("d1 export quiz-biblico-db");
  const apply = workflow.indexOf("db:reconcile-migrations:apply");
  assert.ok(dryRun >= 0 && backup > dryRun && apply > backup);
  assert.match(workflow, /db:reconcile-migrations:verify-pending/);
  assert.match(workflow, /worker:awards:migrate/);
  assert.match(workflow, /db:reconcile-migrations:verify-final/);
  assert.match(workflow, /db:reconcile-migrations:compare/);
  assert.doesNotMatch(workflow, /worker:awards:deploy/);
  assert.match(script, /Unsafe migration ledger state/);
  assert.match(script, /validateMigration0021/);
  assert.match(script, /validateMigration0022/);
  assert.match(script, /assertExactNames\(ledgerNames\(\), expectedFinalLedger/);
  assert.match(docs, /Actions/);
});
