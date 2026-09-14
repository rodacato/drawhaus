import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const CONFIG_MODULE = path.resolve(__dirname, "../../infrastructure/config.ts");

function loadProductionConfig(env: Record<string, string | undefined>) {
  const script = `import(${JSON.stringify(CONFIG_MODULE)}).then(({ config }) =>
    console.log(JSON.stringify({ frontendUrl: config.frontendUrl, fromEmail: config.fromEmail, appVersion: config.appVersion })))`;
  const result = spawnSync(process.execPath, ["--import", "tsx", "-e", script], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      DATABASE_URL: "postgres://drawhaus:drawhaus@127.0.0.1:1/unused",
      SESSION_SECRET: "test-secret",
      ...env,
    },
    encoding: "utf8",
  });
  return {
    exitCode: result.status,
    stderr: result.stderr,
    config: result.status === 0 ? JSON.parse(result.stdout) : null,
  };
}

describe("production config", () => {
  it("boots with a public frontend URL and sends mail from its host", () => {
    const { exitCode, config } = loadProductionConfig({
      FRONTEND_URL: "https://draw.example.com",
    });

    assert.equal(exitCode, 0);
    assert.equal(config.frontendUrl, "https://draw.example.com");
    assert.equal(config.fromEmail, "noreply@draw.example.com");
  });

  it("reports the version from the root package.json when not started through npm", () => {
    const rootManifest = path.resolve(__dirname, "../../../../../package.json");
    const { version } = JSON.parse(readFileSync(rootManifest, "utf8"));

    const { exitCode, config } = loadProductionConfig({
      FRONTEND_URL: "https://draw.example.com",
    });

    assert.equal(exitCode, 0);
    assert.equal(config.appVersion, version);
    assert.notEqual(config.appVersion, "0.0.0");
  });

  it("keeps an explicit FROM_EMAIL over the derived sender", () => {
    const { config } = loadProductionConfig({
      FRONTEND_URL: "https://draw.example.com",
      FROM_EMAIL: "team@example.com",
    });

    assert.equal(config.fromEmail, "team@example.com");
  });

  for (const [label, value] of [
    ["unset", undefined],
    ["empty", ""],
    ["a scheme with no host", "https://"],
    ["a bare hostname", "draw.example.com"],
    ["a non-http scheme", "ftp://draw.example.com"],
  ] as const) {
    it(`refuses to boot when FRONTEND_URL is ${label}`, () => {
      const { exitCode, stderr } = loadProductionConfig({ FRONTEND_URL: value });

      assert.notEqual(exitCode, 0);
      assert.match(stderr, /FRONTEND_URL/);
    });
  }
});
