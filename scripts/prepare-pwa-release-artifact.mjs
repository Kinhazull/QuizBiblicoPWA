import { copyFile, stat } from "node:fs/promises";

const files = [
  [new URL("../.pages-functions/index.js", import.meta.url), new URL("../out/_worker.js", import.meta.url)],
];

for (const [source, destination] of files) {
  const info = await stat(source).catch(() => null);
  if (!info?.isFile() || info.size === 0) {
    throw new Error("pages_functions_bundle_missing_run_build_pages_functions_first");
  }
  await copyFile(source, destination);
}

for (const required of ["../out/_worker.js", "../out/_routes.json", "../out/sw.js", "../out/manifest.webmanifest"]) {
  const info = await stat(new URL(required, import.meta.url)).catch(() => null);
  if (!info?.isFile() || info.size === 0) throw new Error(`pwa_release_artifact_incomplete:${required}`);
}

console.log("Production-like PWA artifact prepared in out/ with the verified Pages Functions bundle.");
