import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const svg = await readFile(resolve("public/app-icon.svg"), "utf8");
const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{margin:0}body{width:${size}px;height:${size}px}svg{display:block;width:100%;height:100%}</style>${svg}`);
  await page.screenshot({ path: resolve(`public/app-icon-${size}.png`), omitBackground: true });
}
const page = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
await page.setContent(`<style>*{margin:0}body{width:180px;height:180px}svg{display:block;width:100%;height:100%}</style>${svg}`);
await page.screenshot({ path: resolve("public/apple-touch-icon.png"), omitBackground: true });
await browser.close();
