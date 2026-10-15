import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = resolve(repo, "design/brand/generated");
const browser = await chromium.launch(
  process.env.BRAND_CHROMIUM ? { executablePath: process.env.BRAND_CHROMIUM } : {},
);
const manifest = {};
try {
  for (const [name, width, height] of [
    ["social-card", 1200, 630],
    ["favicon", 32, 32],
    ["avatar", 512, 512],
  ]) {
    const source = readFileSync(resolve(assets, `${name}.svg`), "utf8");
    const fonts = ["Sora", "Inter"]
      .map((family) => {
        const data = readFileSync(resolve(assets, `fonts/${family}.woff2`)).toString("base64");
        return `@font-face { font-family: '${family}'; src: url(data:font/woff2;base64,${data}); font-weight: 100 900; }`;
      })
      .join("\n");
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>${fonts}body{margin:0}svg{display:block;width:${width}px;height:${height}px}</style>${source}`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.locator("svg").screenshot({ path: resolve(assets, `${name}.png`) });
    manifest[`${name}.svg`] = createHash("sha256").update(source).digest("hex");
    await page.close();
  }
  for (const family of ["Sora", "Inter"]) {
    manifest[`fonts/${family}.woff2`] = createHash("sha256")
      .update(readFileSync(resolve(assets, `fonts/${family}.woff2`)))
      .digest("hex");
  }
  writeFileSync(resolve(assets, "raster-sources.json"), JSON.stringify(manifest, null, 2) + "\n");
} finally {
  await browser.close();
}
console.log("Brand PNG exports regenerated");
