import { copyFile, mkdir, rm, stat } from "node:fs/promises";

const source = new URL("../.pages-functions/index.js", import.meta.url);
const targetDirectory = new URL("../out/", import.meta.url);
const target = new URL("../out/_worker.js", import.meta.url);

await stat(source).catch(() => {
  throw new Error("Pages Functions bundle was not generated at .pages-functions/index.js");
});
await mkdir(targetDirectory, { recursive: true });
await copyFile(source, target);
await rm(new URL("../.pages-functions/", import.meta.url), { recursive: true, force: true });
console.log("Pages Functions packaged as out/_worker.js");
