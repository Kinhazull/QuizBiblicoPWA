import { stat } from "node:fs/promises";
import { resolve } from "node:path";

const cliArgs = process.argv.slice(2);
const separatorIndex = cliArgs.indexOf("--");
const positionalArgs = separatorIndex >= 0 ? cliArgs.slice(separatorIndex + 1) : cliArgs;
if (positionalArgs.length > 1) throw new Error("pages_release_artifact_invalid_arguments");
const root = resolve(positionalArgs[0] || "out");
const requiredFiles = [
  "index.html",
  "configurar-mfa/index.html",
  "recuperar-conta/index.html",
  "admin/index.html",
  "_routes.json",
  "_worker.js",
];

for (const relativePath of requiredFiles) {
  const info = await stat(resolve(root, relativePath)).catch(() => null);
  if (!info?.isFile() || info.size === 0) {
    throw new Error(`pages_release_artifact_incomplete:${relativePath}`);
  }
}

console.log(`Pages release artifact verified: ${requiredFiles.length} critical files present.`);
