import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
    },
  },
  sonarjs.configs.recommended,

  // sonarjs adoption baseline (ratchet).
  // eslint-plugin-sonarjs rides `npm run lint` so Sonar's per-file rules are
  // caught in-editor and by agents before the Sonar CI run; the Sonar server
  // stays source of truth for the quality gate, coverage, and hotspots. Rules
  // that currently fire are parked at "off" to keep the gate green. To ratchet:
  // clear a backlog rule's findings, then delete its line to re-enable it at the
  // recommended severity. Recommended rules that DON'T fire stay on → new code is
  // gated. Counts captured at adoption.
  {
    rules: {
      // Redundant with an existing rule — off permanently.
      "sonarjs/no-unused-vars": "off", // dup of @typescript-eslint/no-unused-vars (2)

      // Likely false-positives / Sonar-excluded paths — off with reason.
      "sonarjs/no-hardcoded-passwords": "off", // 56/58 in __tests__ (Sonar excludes), 2 in db-seed dev fixture; server reports 0 S2068
      "sonarjs/publicly-writable-directories": "off", // (1) in a *.test.ts, Sonar-excluded

      // Real backlog — ratchet: re-enable after clearing.
      "sonarjs/super-linear-regex": "off", // ratchet: re-enable after clearing backlog (1) — also a server hotspot S5852 TO_REVIEW (real, prod sanitizer)
    },
  },
];
