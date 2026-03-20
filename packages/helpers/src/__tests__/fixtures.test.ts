import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateElements } from "../validator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

// ── Option 2: Real diagram fixtures ─────────────────────────────
// Drop any .excalidraw or .excalidraw.json file into fixtures/ and
// this test automatically picks it up and validates its elements.
//
// How to add fixtures:
//   1. Open a diagram in Excalidraw/Drawhaus
//   2. Menu → Export → Save as .excalidraw
//   3. Drop in fixtures/

describe("real diagram fixtures", () => {
  const fixtureFiles = readdirSync(FIXTURES_DIR).filter(
    (f) => f.endsWith(".excalidraw.json") || f.endsWith(".excalidraw"),
  );

  if (fixtureFiles.length === 0) {
    it("no fixtures found (add .excalidraw files to fixtures/)", () => {
      assert.ok(true, "skipped — no fixtures");
    });
    return;
  }

  for (const file of fixtureFiles) {
    it(`validates ${file} without errors`, () => {
      const raw = readFileSync(join(FIXTURES_DIR, file), "utf-8");
      const diagram = JSON.parse(raw);

      assert.ok(Array.isArray(diagram.elements), "diagram should have elements array");

      const result = validateElements(diagram.elements);

      if (!result.valid) {
        const errorDetails = result.errors
          .map(
            (e) =>
              `  [${e.elementIndex}] ${e.elementId ?? "?"}: ${e.field} — ${e.message}`,
          )
          .join("\n");
        assert.fail(
          `Validator rejected real diagram ${file}:\n${errorDetails}\n\n` +
            `This is likely a false positive — update the validator to accept these elements.`,
        );
      }

      // Warnings are OK but log them for visibility
      if (result.warnings.length > 0) {
        const warnDetails = result.warnings
          .map(
            (w) =>
              `  [${w.elementIndex}] ${w.elementId ?? "?"}: ${w.field} — ${w.message}`,
          )
          .join("\n");
        // eslint-disable-next-line no-console
        console.error(`Warnings for ${file}:\n${warnDetails}`);
      }
    });
  }
});
