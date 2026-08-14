import { stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.argv[2] || "out");
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
