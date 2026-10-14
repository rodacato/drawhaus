import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] || resolve(repo, "brand-kit"));
if (existsSync(output) && readdirSync(output).length) {
  throw new Error("Destination is not empty. Choose a new folder to preserve existing files.");
}
if (
  output === repo ||
  ["site", "docs", "apps", "packages", ".git", ".github", "node_modules"].some((name) => {
    const source = resolve(repo, name);
    return output === source || output.startsWith(source + sep);
  })
)
  throw new Error("Choose an export folder outside the canonical source directories.");

// Confirm the source before creating any delivery files.
execFileSync("bash", ["site/build.sh"], { cwd: repo, stdio: "inherit" });
execFileSync(process.execPath, ["site/check.mjs"], { cwd: repo, stdio: "inherit" });
execFileSync("python3", ["--version"], { stdio: "ignore" });
mkdirSync(output, { recursive: true });
const built = resolve(repo, "site/_site");
const copy = (source, target) =>
  cpSync(source, resolve(output, target), {
    recursive: true,
    // Font-maintenance prose belongs in the full repo, not the served font directory.
    filter: (path) => !path.endsWith("README.md"),
  });
copy(built, "site");
copy(resolve(built, "brand/assets"), "assets");
mkdirSync(resolve(output, "sources"));
mkdirSync(resolve(output, "integration"));
for (const [source, target] of [
  ["docs/branding/logo.svg", "sources/logo.svg"],
  ["docs/branding/wordmark.svg", "sources/wordmark.svg"],
  ["apps/frontend/src/globals.css", "sources/globals.css"],
  [".github/workflows/pages.yml", "integration/pages.yml"],
  ["docs/branding/HANDOFF.template.md", "README.md"],
])
  cpSync(resolve(repo, source), resolve(output, target));
// The snapshot is generated; its canonical sources remain tracked in the repository.
writeFileSync(resolve(output, ".gitignore"), "*\n");

function files(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? files(path) : [path];
    })
    .sort();
}
function purpose(name) {
  if (name.startsWith("fonts/") && name.endsWith(".woff2"))
    return "Locally served font; keep its adjacent OFL license.";
  if (name.endsWith("-OFL.txt")) return "Font license; distribute with the corresponding font.";
  if (name === "fonts.css")
    return "Local @font-face declarations; keep the fonts/ folder alongside it.";
  if (name === "tokens.css")
    return "Generated plain CSS roles and dark mapping; imported by the site and integration examples.";
  if (name === "raster-sources.json")
    return "Checksums used to detect outdated PNG exports in the source build.";
  if (name.startsWith("logo-horizontal"))
    return "Header, README or document lockup; outlined wordmark.";
  if (name.startsWith("logo-stacked"))
    return "Logo for square covers and taller layouts; outlined wordmark.";
  if (name.startsWith("wordmark"))
    return "Outlined product name; use when the mark already appears nearby.";
  if (name.startsWith("mark-mono")) return "One-color symbol for print and monochrome contexts.";
  if (name === "mark-solid.svg") return "Solid blue symbol when a gradient is unsuitable.";
  if (name.startsWith("mark-"))
    return "Ocean Ink symbol for compact navigation and brand signatures.";
  if (name.startsWith("favicon")) return "Browser tab icon; use the prepared SVG or PNG export.";
  if (name.startsWith("avatar"))
    return "Square product/profile image; SVG is editable, PNG is ready to upload.";
  if (name.startsWith("social-card"))
    return name.endsWith(".png")
      ? "Finished product image for link previews and announcements."
      : "Editable social layout; its live text uses the supplied fonts.";
  throw new Error(`Unclassified asset: ${name}`);
}
const index = files(resolve(output, "assets")).map((path) => {
  const name = relative(resolve(output, "assets"), path).split(sep).join("/");
  const surface = name.includes("-dark.")
    ? " For dark surfaces."
    : name.includes("-light.")
      ? " For light surfaces."
      : "";
  return `| [${name}](assets/${name}) | ${purpose(name)}${surface} |`;
});
writeFileSync(
  resolve(output, "ASSETS.md"),
  `# File-purpose index\n\nGenerated from the files in this export. Start with [README.md](README.md) for integration.\n\n| File | Use |\n| --- | --- |\n${index.join("\n")}\n\nThe complete site is in [site/](site/); editable inputs are in [sources/](sources/).\n`,
);
cpSync(resolve(repo, "site/verify-brand-kit.py"), resolve(output, "verify.py"));
const manifest = {
  identity: "Drawhaus / Looped d / Ocean Ink",
  sourceRepository: "https://github.com/rodacato/drawhaus",
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(),
  exportedAt: new Date().toISOString(),
  files: Object.fromEntries(
    files(output).map((path) => [
      relative(output, path).split(sep).join("/"),
      createHash("sha256").update(readFileSync(path)).digest("hex"),
    ]),
  ),
};
writeFileSync(resolve(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
execFileSync(
  "python3",
  [
    "-c",
    `
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys
root = Path(sys.argv[1])
archive = root / 'drawhaus-brand-kit.zip'
with ZipFile(archive, 'w', compression=ZIP_DEFLATED) as bundle:
    for item in sorted(root.rglob('*')):
        if item.is_file() and item != archive:
            bundle.write(item, 'drawhaus-brand-kit/' + item.relative_to(root).as_posix())
`,
    output,
  ],
  { stdio: "inherit" },
);
execFileSync("python3", [resolve(output, "verify.py")], { cwd: output, stdio: "inherit" });
console.log(`Brand kit exported to ${output}`);
