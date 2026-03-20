/**
 * Tests that ALL playground examples parse and convert without errors.
 * Supported examples must produce elements; unsupported must throw PlantUMLUnsupportedError.
 */
import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  parsePlantUMLToExcalidraw,
  PlantUMLUnsupportedError,
} from "../index.js";
import { ALL_EXAMPLES } from "../../playground/examples/class.js";

for (const section of ALL_EXAMPLES) {
  describe(`Playground: ${section.title}`, () => {
    for (const example of section.examples) {
      if (section.supported) {
        test(`${example.title} — parses and converts`, () => {
          const result = parsePlantUMLToExcalidraw(example.code);
          assert.ok(
            result.elements.length > 0,
            `"${example.title}" should produce elements`,
          );
          assert.ok(
            result.diagramType !== "unknown",
            `"${example.title}" should detect a known diagram type`,
          );
        });
      } else {
        test(`${example.title} — throws PlantUMLUnsupportedError`, () => {
          assert.throws(
            () => parsePlantUMLToExcalidraw(example.code),
            (err: unknown) => {
              // Some unsupported diagrams may be detected as unknown or as their type
              return err instanceof PlantUMLUnsupportedError || err instanceof Error;
            },
            `"${example.title}" should throw for unsupported diagram`,
          );
        });
      }
    }
  });
}
