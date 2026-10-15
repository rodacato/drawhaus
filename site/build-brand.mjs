import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(repo, process.argv[2] || "design/brand/generated");
mkdirSync(output, { recursive: true });

const css = readFileSync(resolve(repo, "apps/frontend/src/globals.css"), "utf8");
const theme = css.match(/@theme(?:\s+static)?\s*\{([\s\S]*?)\n\}/)?.[1];
if (!theme) throw new Error("Missing canonical theme");
const entries = [...theme.matchAll(/(--[\w-]+):\s*([^;]+);/g)]
  .filter(([, name]) => name.includes("-brand-") || name.startsWith("--font-family-"))
  .map(([, name, value]) => [name, value.trim()]);
const tokens = Object.fromEntries(entries);
const color = (name) => {
  const value = tokens[`--color-brand-${name}`];
  if (!/^#[a-f\d]{6}$/i.test(value)) throw new Error(`Missing brand color: ${name}`);
  return value;
};

const overrides = {
  canvas: "dark",
  paper: "dark-paper",
  ink: "dark-ink",
  secondary: "dark-secondary",
  line: "dark-line",
  action: "dark-action",
  "action-hover": "dark-action-hover",
  "on-action": "dark",
  selection: "dark-paper",
  "logo-start": "dark-logo-start",
  "logo-end": "dark-logo-end",
  success: "dark-success",
  danger: "dark-danger",
  warning: "dark-warning",
};
const declarations = entries.map(([name, value]) => `  ${name}: ${value};`).join("\n");
const dark = Object.entries(overrides)
  .map(([role, source]) => `  --color-brand-${role}: var(--color-brand-${source});`)
  .join("\n");
writeFileSync(
  resolve(output, "tokens.css"),
  `/* Generated from apps/frontend/src/globals.css. Do not edit. */\n:root {\n${declarations}\n}\n.theme-dark {\n${dark}\n}\n`,
);
writeFileSync(
  resolve(output, "fonts.css"),
  [
    ["Sora", "Sora", "100 800"],
    ["Inter", "Inter", "100 900"],
    ["JetBrains Mono", "JetBrainsMono", "100 800"],
  ]
    .map(
      ([family, file, weight]) =>
        `@font-face { font-family: "${family}"; src: url("fonts/${file}.woff2") format("woff2"); font-weight: ${weight}; font-style: normal; font-display: swap; }`,
    )
    .join("\n") + "\n",
);
cpSync(resolve(repo, "design/brand/fonts"), resolve(output, "fonts"), {
  recursive: true,
  filter: (source) => !source.endsWith(".py"),
});

const markSource = readFileSync(resolve(repo, "design/brand/logo.svg"), "utf8");
const mark = markSource.match(/<path\s[^>]+\/>/)?.[0];
if (!mark) throw new Error("Missing selected logo path");
const wordmarkSource = readFileSync(resolve(repo, "design/brand/wordmark.svg"), "utf8");
const wordmark = wordmarkSource.match(/<path\s[^>]+\/>/)?.[0];
const wordmarkWidth = Number(wordmarkSource.match(/viewBox="0 0 ([\d.]+) 60"/)?.[1]);
if (!wordmark || !wordmarkWidth) throw new Error("Missing outlined wordmark");
const svg = (width, height, contents, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title"><title id="title">${title}</title>${contents}</svg>\n`;
const paintedMark = (stroke) => mark.replace('stroke="currentColor"', `stroke="${stroke}"`);
const paintedWord = (fill) => wordmark.replace('fill="currentColor"', `fill="${fill}"`);
const gradient = (mode) =>
  `<defs><linearGradient id="ocean" x1="20" y1="80" x2="80" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="${color(mode === "light" ? "logo-start" : "dark-logo-start")}"/><stop offset="1" stop-color="${color(mode === "light" ? "logo-end" : "dark-logo-end")}"/></linearGradient></defs>`;
const save = (name, contents) => writeFileSync(resolve(output, name), contents);
for (const mode of ["light", "dark"]) {
  const ink = color(mode === "light" ? "ink" : "dark-ink");
  const identity = gradient(mode) + paintedMark("url(#ocean)");
  save(`mark-${mode}.svg`, svg(100, 100, identity, `Drawhaus mark for ${mode} surfaces`));
  save(
    `mark-mono-${mode}.svg`,
    svg(100, 100, paintedMark(ink), `Drawhaus monochrome mark for ${mode} surfaces`),
  );
  save(
    `logo-horizontal-${mode}.svg`,
    svg(
      110 + wordmarkWidth,
      100,
      gradient(mode) +
        paintedMark("url(#ocean)") +
        `<g transform="translate(110 20)">${paintedWord(ink)}</g>`,
      `Drawhaus logo for ${mode} surfaces`,
    ),
  );
  save(
    `logo-stacked-${mode}.svg`,
    svg(
      300,
      180,
      gradient(mode) +
        `<g transform="translate(100 0)">${paintedMark("url(#ocean)")}</g><g transform="translate(${(300 - wordmarkWidth) / 2} 105)">${paintedWord(ink)}</g>`,
      `Drawhaus stacked logo for ${mode} surfaces`,
    ),
  );
  save(
    `wordmark-${mode}.svg`,
    svg(wordmarkWidth, 60, paintedWord(ink), `Drawhaus outlined wordmark for ${mode} surfaces`),
  );
}
save("mark-solid.svg", svg(100, 100, paintedMark(color("action")), "Drawhaus solid blue mark"));
save(
  "favicon.svg",
  svg(
    100,
    100,
    `<rect width="100" height="100" rx="22" fill="${color("canvas")}"/>${gradient("light")}${paintedMark("url(#ocean)")}`,
    "Drawhaus favicon",
  ),
);
save(
  "avatar.svg",
  svg(
    512,
    512,
    `<rect width="512" height="512" rx="104" fill="${color("dark")}"/>${gradient("dark")}<g transform="translate(90 90) scale(3.32)">${paintedMark("url(#ocean)")}</g>`,
    "Drawhaus avatar",
  ),
);
save(
  "social-card.svg",
  svg(
    1200,
    630,
    `<rect width="1200" height="630" fill="${color("dark")}"/>
  ${gradient("dark")}<g transform="translate(58 48) scale(.8)">${paintedMark("url(#ocean)")}</g>
  <g transform="translate(154 58)">${paintedWord(color("dark-ink"))}</g>
  <text x="80" y="264" font-family="Sora, sans-serif" font-size="72" font-weight="600" fill="${color("dark-ink")}">Your whiteboard,</text>
  <text x="80" y="355" font-family="Sora, sans-serif" font-size="72" font-weight="600" fill="${color("dark-logo-end")}">on your server.</text>
  <text x="82" y="433" font-family="Inter, sans-serif" font-size="27" fill="${color("dark-secondary")}">Self-hosted diagrams. Built on Excalidraw.</text>
  <path d="M80 496H1120" stroke="${color("dark-line")}"/>
  <text x="82" y="554" font-family="Inter, sans-serif" font-size="22" fill="${color("dark-secondary")}">Open source · MIT</text>
  <g transform="translate(916 60) scale(2.2)" opacity=".16">${paintedMark(color("dark-logo-end"))}</g>`,
    "Drawhaus — Your whiteboard, on your server",
  ),
);
console.log(`Brand assets generated: ${output}`);
