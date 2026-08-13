import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputs = [
  ...["coin", "xp", "level", "achievement", "daily-challenge"].map(name => ({ name, kind: "compact", size: 96 })),
  ...["achievement", "daily-challenge", "chest-standard", "chest-special", "chest-daily"].map(name => ({ name, kind: "card", size: 320 })),
];
const browser = await chromium.launch();

for (const output of outputs) {
  const source = resolve(`public/rewards/${output.name}.png`);
  const destination = resolve(`public/rewards/runtime/${output.name}-${output.kind}.png`);
  await mkdir(dirname(destination), { recursive: true });
  const data = `data:image/png;base64,${(await readFile(source)).toString("base64")}`;
  const page = await browser.newPage({ viewport: { width: output.size, height: output.size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:${output.size}px;height:${output.size}px;overflow:hidden;background:transparent}body{display:grid;place-items:center}img{display:block;width:100%;height:100%;object-fit:contain}</style><img alt="" src="${data}">`);
  await page.locator("img").evaluate(image => image.decode());
  await page.screenshot({ path: destination, omitBackground: true });
  await page.close();
}

await browser.close();
