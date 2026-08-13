import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const games = ["quiz", "wordle", "three-clues", "timeline", "memory", "association", "who-am-i"];
const browser = await chromium.launch();

for (const game of games) {
  const source = resolve(`public/games/${game}/cover-art.png`);
  const destination = resolve(`public/games/${game}/runtime/cover-card.png`);
  await mkdir(dirname(destination), { recursive: true });
  const data = `data:image/png;base64,${(await readFile(source)).toString("base64")}`;
  const page = await browser.newPage({ viewport: { width: 420, height: 420 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:420px;height:420px;overflow:hidden;background:transparent}body{display:grid;place-items:center}img{display:block;width:420px;height:420px;object-fit:contain}</style><img alt="" src="${data}">`);
  await page.locator("img").evaluate(image => image.decode());
  await page.screenshot({ path: destination, omitBackground: true });
  await page.close();
}

await browser.close();
