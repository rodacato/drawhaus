import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(repo, process.argv[2] || "site/_site");
const files = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(output);
function checkReference(file, reference) {
  if (/^(https?:|#|mailto:|data:)/.test(reference)) return;
  const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
  if (!clean) return;
  if (clean.startsWith("/")) throw new Error(`Base-path-unsafe reference in ${file}: ${reference}`);
  const path = resolve(dirname(file), clean);
  if (!path.startsWith(output + "/") && path !== output)
    throw new Error(`Reference escapes output: ${reference}`);
  if (
    !existsSync(path) ||
    (statSync(path).isDirectory() && !existsSync(resolve(path, "index.html")))
  ) {
    throw new Error(`Missing reference in ${file}: ${reference}`);
  }
}
for (const file of files) {
  if (file.endsWith(".html")) {
    const html = readFileSync(file, "utf8");
    for (const [, reference] of html.matchAll(/(?:src|href)="([^"\n]+)"/g))
      checkReference(file, reference);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate IDs: ${file}`);
    for (const [, fragment] of html.matchAll(/href="#([^"]+)"/g)) {
      if (!ids.includes(fragment)) throw new Error(`Missing fragment: ${file}#${fragment}`);
    }
  }
  if (file.endsWith(".css")) {
    for (const [, reference] of readFileSync(file, "utf8").matchAll(/url\(["']?([^"')]+)["']?\)/g))
      checkReference(file, reference);
  }
}
const assets = resolve(output, "brand/assets");
const manifest = JSON.parse(readFileSync(resolve(assets, "raster-sources.json"), "utf8"));
for (const [name, hash] of Object.entries(manifest)) {
  const actual = createHash("sha256")
    .update(readFileSync(resolve(assets, name)))
    .digest("hex");
  if (hash !== actual)
    throw new Error(`Stale PNG source: ${name}. Run node site/export-brand-png.mjs`);
}
for (const name of ["social-card", "favicon", "avatar"]) {
  const bytes = readFileSync(resolve(assets, `${name}.png`));
  const width = bytes.readUInt32BE(16),
    height = bytes.readUInt32BE(20);
  const size = name === "social-card" ? [1200, 630] : name === "favicon" ? [32, 32] : [512, 512];
  if (width !== size[0] || height !== size[1]) throw new Error(`Incorrect PNG dimensions: ${name}`);
}
const home = readFileSync(resolve(output, "index.html"), "utf8");
if (!home.includes('content="https://rodacato.github.io/drawhaus/brand/assets/social-card.png"'))
  throw new Error("Missing product social image metadata");
console.log(
  `SITE-VALID (${files.filter((file) => file.endsWith(".html")).length} pages, references and raster sources checked)`,
);
