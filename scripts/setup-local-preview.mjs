import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const configPath = resolve(root, "wrangler.local.jsonc");
const statePath = resolve(root, ".wrangler", "local-state");
const seedPath = resolve(root, ".wrangler", "local-seed.sql");
const wranglerEntry = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
const productionDatabaseId = "33fc35a0-46cf-4756-b6be-89b07371256c";
const localDatabaseName = "quiz-biblico-local";

const localAdmin = Object.freeze({
  id: "local-admin-user",
  organizationId: "local-organization",
  groupId: "local-group",
  username: "adminlocal",
  displayName: "Administrador Local",
  password: "TesteLocal2026!",
});

function fail(message) {
  throw new Error(`[local-only] ${message}`);
}

function runWrangler(args) {
  if (!args.includes("--local")) fail("Wrangler D1 recusado porque --local não foi informado.");
  if (args.includes("--remote")) fail("Wrangler D1 remoto é proibido neste fluxo.");
  const result = spawnSync(process.execPath, [wranglerEntry, ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`Wrangler encerrou com código ${result.status}.`);
}

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

async function passwordCredential(password) {
  const salt = base64Url(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: new TextEncoder().encode(salt),
    iterations: 100_000,
  }, key, 256);
  return { salt, hash: `pbkdf2-sha256$100000$${base64Url(new Uint8Array(bits))}` };
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function main() {
  const config = await readFile(configPath, "utf8");
  if (config.includes(productionDatabaseId)) fail("A configuração local contém o ID do D1 de produção.");
  if (!config.includes(`\"database_name\": \"${localDatabaseName}\"`)) fail("Banco local esperado não foi encontrado na configuração.");

  await mkdir(statePath, { recursive: true });
  const common = ["--local", "--config", configPath, "--persist-to", statePath];
  runWrangler(["d1", "migrations", "apply", localDatabaseName, ...common]);

  const credential = await passwordCredential(localAdmin.password);
  const now = Date.now();
  const seed = `PRAGMA foreign_keys = ON;
INSERT OR IGNORE INTO organizations (id,name,slug,timezone,created_at) VALUES (${sqlString(localAdmin.organizationId)},'Comunidade Local','comunidade-local','America/Sao_Paulo',${now});
INSERT OR IGNORE INTO groups (id,organization_id,name,active,created_at) VALUES (${sqlString(localAdmin.groupId)},${sqlString(localAdmin.organizationId)},'Grupo Local',1,${now});
INSERT OR IGNORE INTO users (id,organization_id,group_id,username,display_name,password_hash,password_salt,role,status,must_change_password,approved_at,created_at,updated_at) VALUES (${sqlString(localAdmin.id)},${sqlString(localAdmin.organizationId)},${sqlString(localAdmin.groupId)},${sqlString(localAdmin.username)},${sqlString(localAdmin.displayName)},${sqlString(credential.hash)},${sqlString(credential.salt)},'admin','active',0,${now},${now},${now});
INSERT OR IGNORE INTO legal_consents (id,user_id,terms_version,privacy_version,accepted_at) VALUES ('local-admin-consent',${sqlString(localAdmin.id)},'local-development','local-development',${now});
`;
  await writeFile(seedPath, seed, "utf8");
  runWrangler(["d1", "execute", localDatabaseName, ...common, "--file", seedPath]);

  console.log("\nAmbiente D1 local preparado sem acesso remoto.");
  console.log(`Usuário: ${localAdmin.username}`);
  console.log(`Senha: ${localAdmin.password}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
