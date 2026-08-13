import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const browser = await chromium.launch();
const runtimeDir = resolve("public/brand/v2/runtime");
await mkdir(runtimeDir, { recursive: true });

async function pngData(path) {
  return `data:image/png;base64,${(await readFile(resolve(path))).toString("base64")}`;
}

async function render({ source, destination, width, height, imageWidth = width, imageHeight = height, background = "transparent" }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const data = await pngData(source);
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${background}}body{display:grid;place-items:center}img{display:block;width:${imageWidth}px;height:${imageHeight}px;object-fit:contain}</style><img alt="" src="${data}">`);
  await page.locator("img").evaluate(image => image.decode());
  await page.screenshot({ path: resolve(destination), omitBackground: background === "transparent" });
  await page.close();
}

const master = "public/brand/v2/app-icon-master.png";
await render({ source: master, destination: "public/icons/icon-192.png", width: 192, height: 192 });
await render({ source: master, destination: "public/icons/icon-512.png", width: 512, height: 512 });
await render({ source: master, destination: "public/apple-touch-icon.png", width: 180, height: 180 });
await render({ source: "public/brand/v2/favicon-master.png", destination: "public/favicon.png", width: 48, height: 48 });

// Maskable icons require an opaque canvas and keep the essential mark inside the central safe zone.
await render({ source: master, destination: "public/icons/icon-maskable-512.png", width: 512, height: 512, imageWidth: 320, imageHeight: 320, background: "#234e9a" });

await render({ source: "public/brand/v2/logo-horizontal.png", destination: "public/brand/v2/runtime/logo-on-dark.png", width: 480, height: 206 });
await render({ source: "public/brand/v2/logo-horizontal-light.png", destination: "public/brand/v2/runtime/logo-on-light.png", width: 480, height: 206 });

await browser.close();
