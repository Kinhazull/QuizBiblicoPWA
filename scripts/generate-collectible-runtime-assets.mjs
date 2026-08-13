import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const avatars = ["avatar-ark", "avatar-crown", "avatar-dove", "avatar-fish", "avatar-lamp", "avatar-lion", "avatar-olive", "avatar-scroll"];
const frames = [
  ["frame-bronze", "frame-bronze"], ["frame-celestial", "frame-celestial"], ["frame-gold", "frame-gold"],
  ["frame-light", "frame-light"], ["frame-olive", "frame-olive"], ["frame-silver", "frame-silver"],
  ["frame-covenant", "frame-aliance"], ["frame-royal", "frame-real"],
];
const outputs = [
  ...avatars.flatMap(id => [[id, `avatars/${id}`, 96], [id, `avatars/${id}`, 320]]),
  ...frames.flatMap(([id, source]) => [[source, `frames/${id}`, 96], [source, `frames/${id}`, 320]]),
];
const browser = await chromium.launch();
for (const [sourceName, outputName, size] of outputs) {
  const category = outputName.startsWith("avatars/") ? "avatars" : "frames";
  const source = resolve(`public/collectibles/v1/${category}/${sourceName}.png`);
  const suffix = size === 96 ? "compact" : "standard";
  const destination = resolve(`public/collectibles/runtime/${outputName}-${suffix}.png`);
  await mkdir(dirname(destination), { recursive: true });
  const data = `data:image/png;base64,${(await readFile(source)).toString("base64")}`;
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}body{display:grid;place-items:center}img{display:block;width:100%;height:100%;object-fit:contain}</style><img alt="" src="${data}">`);
  await page.locator("img").evaluate(image => image.decode());
  await page.screenshot({ path: destination, omitBackground: true });
  await page.close();
}
await browser.close();
