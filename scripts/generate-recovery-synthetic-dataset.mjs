import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRecoverySyntheticSql, RECOVERY_SYNTHETIC_MANIFEST } from "./lib/recovery-synthetic-dataset.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(projectRoot, process.argv[2] || "outputs/recovery/recovery-synthetic-0039.sql");
if (!output.endsWith(".sql")) throw new Error("recovery_output_must_be_sql");
const sql = buildRecoverySyntheticSql({ migrationsDirectory: resolve(projectRoot, "drizzle") });
await mkdir(dirname(output), { recursive: true });
await writeFile(output, sql, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({ kind: "SYNTHETIC_RECOVERY_DATA", output, schemaVersion: RECOVERY_SYNTHETIC_MANIFEST.schemaVersion }));
