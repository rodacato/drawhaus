module.exports = {
  ignorePatterns: ["dist/", "node_modules/", "vite.config.ts"],
  env: {
    browser: true,
    es2020: true,
  },
  extends: ["eslint:recommended", "plugin:sonarjs/recommended-legacy"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@typescript-eslint"],
  settings: {
    react: {
      version: "detect",
    },
  },
  globals: {
    React: "readonly",
  },
  rules: {
    "no-undef": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

    // sonarjs adoption baseline (ratchet).
    // eslint-plugin-sonarjs rides `npm run lint` so Sonar's per-file rules are
    // caught in-editor and by agents before the Sonar CI run; the Sonar server
    // stays source of truth for the quality gate, coverage, and hotspots. Rules
    // that currently fire are parked at "off" to keep the gate green. To ratchet:
    // clear a backlog rule's findings, then delete its line to re-enable it.
    // Recommended rules that DON'T fire stay on → new code is gated. Counts
    // captured at adoption.

    // Redundant with an existing rule — off permanently.
    "sonarjs/no-unused-vars": "off", // dup of @typescript-eslint/no-unused-vars (6)

    // Likely false-positive / non-security context — off with reason.
    "sonarjs/pseudo-random": "off", // (7) Math.random for UI animation in AnimatedBackground.tsx; server has 7 S2245 hotspots TO_REVIEW — triage Safe to match

    // Real backlog — ratchet: re-enable after clearing.
    "sonarjs/prefer-specific-assertions": "off", // ratchet: re-enable after clearing backlog (18)
  },
};
