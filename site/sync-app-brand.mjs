import { mkdtempSync, rmSync, cpSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(repo, "apps/frontend/public/brand");
const scratch = mkdtempSync(resolve(tmpdir(), "drawhaus-brand-"));
const appFiles = /^(mark-|logo-|wordmark-|favicon\.svg$|fonts)/;

execFileSync("node", [resolve(repo, "site/build-brand.mjs"), scratch], { stdio: "inherit" });
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(scratch, target, {
  recursive: true,
  filter: (source) => {
    const name = source.slice(scratch.length + 1);
    return name === "" || appFiles.test(name.split("/")[0]) || name.startsWith("fonts");
  },
});
cpSync(resolve(repo, "design/brand/generated/favicon.png"), resolve(target, "favicon.png"));
rmSync(scratch, { recursive: true, force: true });
console.log(`App brand assets synced: ${target}`);
