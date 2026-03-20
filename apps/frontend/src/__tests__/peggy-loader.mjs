import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import peggy from "peggy";

/**
 * Register a CJS require hook for .peggy files so tsx can load them.
 * This runs at import time via --import flag.
 */
const require = createRequire(import.meta.url);
const Module = require("module");

Module._extensions[".peggy"] = function (mod, filename) {
  const source = readFileSync(filename, "utf-8");
  const code = peggy.generate(source, { output: "source", format: "commonjs" });
  mod._compile(code, filename);
};
