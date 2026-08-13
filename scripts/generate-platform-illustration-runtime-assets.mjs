import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputs = [
  ["public/illustration/system/offline.png", "system/offline-card.png"],
  ["public/illustration/system/empty-state.png", "system/empty-state-card.png"],
  ["public/illustration/system/error-state.png", "system/error-state-card.png"],
  ["public/illustration/celebration.png", "progression/celebration-card.png"],
  ["public/illustration/progression/collection-complete.png", "progression/collection-complete-card.png"],
  ["public/illustration/progression/ranking-podium.png", "progression/ranking-podium-card.png"],
  ["public/events/default-event.png", "events/default-event-card.png"],
  ["public/events/event-completed.png", "events/event-completed-card.png"],
  ["public/events/event-unavailable.png", "events/event-unavailable-card.png"],
];

const size = 320;
const browser = await chromium.launch();
for (const [sourcePath, outputPath] of outputs) {
  const destination = resolve(`public/illustration/runtime/${outputPath}`);
  await mkdir(dirname(destination), { recursive: true });
  const data = `data:image/png;base64,${(await readFile(resolve(sourcePath))).toString("base64")}`;
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}body{display:grid;place-items:center}img{display:block;width:100%;height:100%;object-fit:contain}</style><img alt="" src="${data}">`);
  await page.locator("img").evaluate(image => image.decode());
  await page.screenshot({ path: destination, omitBackground: true });
  await page.close();
}
await browser.close();
