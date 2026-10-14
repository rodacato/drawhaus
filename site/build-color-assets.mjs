import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = process.argv[2];
if (!output) throw new Error("Provide a color asset output directory");

const source = readFileSync(resolve(repo, "docs/branding/proposals/looped-d.svg"), "utf8");
const palettes = readFileSync(resolve(repo, "site/brand/colors/palettes.css"), "utf8");
mkdirSync(output, { recursive: true });

for (const name of ["architect", "amber", "ocean"]) {
  const rule = palettes.match(new RegExp(`\\.palette-${name}\\s*\\{([^}]+)\\}`))?.[1];
  if (!rule) throw new Error(`Missing palette: ${name}`);

  const color = (role) => {
    const value = rule.match(new RegExp(`--palette-${role}:\\s*(#[a-f\\d]{6});`, "i"))?.[1];
    if (!value) throw new Error(`Missing color: ${name}/${role}`);
    return value;
  };

  for (const mode of ["light", "dark"]) {
    const prefix = mode === "light" ? "logo" : "dark";
    const start = color(`${prefix}-start`);
    const end = color(`${prefix}-end`);
    const gradient = start !== end;
    const stroke = gradient ? "url(#brand-ink)" : start;
    const defs = gradient
      ? `<defs><linearGradient id="brand-ink" x1="20" y1="80" x2="80" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs>`
      : "";
    const svg = source
      .replace(
        /<title[^>]*>[\s\S]*?<\/title>/,
        `<title id="title">Drawhaus Looped d: ${name}, ${mode}</title>${defs}`,
      )
      .replace(/stroke="#[a-f\d]{6}"/i, `stroke="${stroke}"`);
    writeFileSync(resolve(output, `looped-d-${name}-${mode}.svg`), svg);
  }
}
