import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRect,
  createText,
  createArrow,
  createLine,
  resetIdCounter,
  layoutGraph,
  buildArrowPoints,
  validateElements,
} from "../index.js";
import { DIAGRAM_STYLES } from "../defaults.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(__dirname, "fixtures");

// ── Option 3: Golden file tests ─────────────────────────────────
// These tests build complete diagrams using builders + layout
// and compare the output against a saved golden file.
//
// To update golden files after intentional changes:
//   rm packages/helpers/src/__tests__/fixtures/golden-*.json
//   npm test --workspace=@drawhaus/helpers
//
// The first run regenerates them. Subsequent runs compare.

function loadOrCreateGolden(name: string, generate: () => unknown): unknown {
  const path = join(GOLDEN_DIR, `golden-${name}.json`);

  const generated = generate();

  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(generated, null, 2) + "\n");
    // eslint-disable-next-line no-console
    console.error(`  Golden file created: golden-${name}.json (first run)`);
    return generated;
  }

  const saved = JSON.parse(readFileSync(path, "utf-8"));
  return saved;
}

describe("golden file: db schema diagram", () => {
  beforeEach(() => resetIdCounter());

  it("produces stable output for a 3-table DB schema", () => {
    const styles = DIAGRAM_STYLES.dbSchema;

    function generateDbSchema() {
      // Define tables
      const tables = [
        { name: "users", columns: ["id: uuid PK", "name: text", "email: text"] },
        { name: "orders", columns: ["id: uuid PK", "user_id: uuid FK", "total: numeric"] },
        { name: "items", columns: ["id: uuid PK", "order_id: uuid FK", "product: text", "qty: int"] },
      ];

      const CHAR_WIDTH = 8.4;
      const PADDING_X = 16;
      const HEADER_HEIGHT = 40;
      const ROW_HEIGHT = 22;
      const PADDING_Y = 10;

      // Measure tables
      const measured = tables.map((t) => {
        const allLines = [t.name, ...t.columns];
        const width = Math.max(
          ...allLines.map((l) => l.length * CHAR_WIDTH + PADDING_X * 2),
          140,
        );
        const height = HEADER_HEIGHT + t.columns.length * ROW_HEIGHT + PADDING_Y * 2;
        return { ...t, width, height };
      });

      // Layout with dagre
      const layoutNodes = measured.map((t) => ({
        id: t.name,
        width: t.width,
        height: t.height,
      }));

      const layoutEdges = [
        { source: "users", target: "orders", id: "fk-orders-users" },
        { source: "orders", target: "items", id: "fk-items-orders" },
      ];

      const layout = layoutGraph(layoutNodes, layoutEdges, "LR", 100, 160);

      // Build elements
      const elements: ReturnType<typeof createRect>[] = [];

      for (const table of measured) {
        const pos = layout.nodes.get(table.name)!;

        // Table rectangle
        elements.push(
          createRect({
            id: `table-${table.name}`,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
            backgroundColor: styles.table.backgroundColor,
            strokeColor: styles.table.strokeColor,
            roundness: 8,
          }),
        );

        // Table name
        elements.push(
          createText({
            id: `title-${table.name}`,
            x: pos.x + PADDING_X,
            y: pos.y + PADDING_Y,
            text: table.name,
            fontSize: 16,
            fontFamily: 1,
            textAlign: "center",
          }),
        );

        // Separator
        elements.push(
          createLine({
            id: `sep-${table.name}`,
            startX: pos.x,
            startY: pos.y + HEADER_HEIGHT,
            endX: pos.x + pos.width,
            endY: pos.y + HEADER_HEIGHT,
          }),
        );

        // Columns
        table.columns.forEach((col, i) => {
          elements.push(
            createText({
              id: `col-${table.name}-${i}`,
              x: pos.x + PADDING_X,
              y: pos.y + HEADER_HEIGHT + PADDING_Y + i * ROW_HEIGHT,
              text: col,
              fontSize: styles.column.fontSize,
              fontFamily: styles.column.fontFamily,
            }),
          );
        });
      }

      // FK arrows
      for (const edge of layoutEdges) {
        const sourcePos = layout.nodes.get(edge.source)!;
        const targetPos = layout.nodes.get(edge.target)!;
        const edgePoints = layout.edges.get(edge.id);

        const points = buildArrowPoints(sourcePos, targetPos, edgePoints?.points);

        elements.push(
          createArrow({
            id: `arrow-${edge.id}`,
            points,
            endArrowhead: styles.foreignKey.endArrowhead,
            strokeStyle: styles.foreignKey.strokeStyle,
            startBinding: { elementId: `table-${edge.source}` },
            endBinding: { elementId: `table-${edge.target}` },
          }),
        );
      }

      return elements;
    }

    const generated = generateDbSchema();
    const golden = loadOrCreateGolden("db-schema", generateDbSchema);

    // Compare structure (ignore IDs since they have timestamps)
    assert.equal(
      (generated as unknown[]).length,
      (golden as unknown[]).length,
      "Element count should match golden file",
    );

    // Validate the generated output
    const validation = validateElements(generated);
    assert.equal(validation.valid, true, "Generated diagram should be valid");
    assert.equal(validation.errors.length, 0, "No validation errors");

    // Verify element types match
    const generatedTypes = (generated as Array<{ type: string }>).map((e) => e.type);
    const goldenTypes = (golden as Array<{ type: string }>).map((e) => e.type);
    assert.deepEqual(generatedTypes, goldenTypes, "Element types should match golden file");

    // Verify key structural properties are stable
    for (let i = 0; i < (generated as unknown[]).length; i++) {
      const gen = (generated as Array<Record<string, unknown>>)[i];
      const gold = (golden as Array<Record<string, unknown>>)[i];

      assert.equal(gen.type, gold.type, `Element ${i}: type mismatch`);
      assert.equal(gen.width, gold.width, `Element ${i}: width mismatch`);
      assert.equal(gen.height, gold.height, `Element ${i}: height mismatch`);

      if (gen.text !== undefined) {
        assert.equal(gen.text, gold.text, `Element ${i}: text mismatch`);
      }
    }
  });
});

describe("golden file: class diagram", () => {
  beforeEach(() => resetIdCounter());

  it("produces stable output for a 2-class hierarchy", () => {
    const styles = DIAGRAM_STYLES.classDiagram;

    function generateClassDiagram() {
      const classes = [
        { name: "Animal", kind: "abstract" as const, attrs: ["name: string", "age: number"], methods: ["speak(): void"] },
        { name: "Dog", kind: "class" as const, attrs: ["breed: string"], methods: ["fetch(): void", "bark(): void"] },
      ];

      const CHAR_WIDTH = 8.4;
      const PADDING_X = 16;
      const HEADER_H = 35;
      const ROW_H = 22;
      const SEP_H = 8;
      const PADDING_Y = 10;

      const measured = classes.map((c) => {
        const allLines = [c.name, ...c.attrs, ...c.methods];
        const width = Math.max(...allLines.map((l) => l.length * CHAR_WIDTH + PADDING_X * 2), 160);
        const height = HEADER_H + c.attrs.length * ROW_H + SEP_H + c.methods.length * ROW_H + PADDING_Y * 2;
        return { ...c, width, height };
      });

      const layoutNodes = measured.map((c) => ({ id: c.name, width: c.width, height: c.height }));
      const layoutEdges = [{ source: "Dog", target: "Animal", id: "inheritance" }];
      const layout = layoutGraph(layoutNodes, layoutEdges, "TB", 80, 120);

      const elements: ReturnType<typeof createRect>[] = [];

      for (const cls of measured) {
        const pos = layout.nodes.get(cls.name)!;
        const style = styles[cls.kind];

        elements.push(
          createRect({
            id: `class-${cls.name}`,
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
            backgroundColor: style.backgroundColor,
            strokeStyle: style.strokeStyle,
          }),
        );

        elements.push(
          createText({
            id: `name-${cls.name}`,
            x: pos.x + PADDING_X,
            y: pos.y + PADDING_Y,
            text: cls.name,
            fontSize: 16,
            textAlign: "center",
          }),
        );

        let curY = pos.y + HEADER_H;

        elements.push(
          createLine({
            id: `sep1-${cls.name}`,
            startX: pos.x,
            startY: curY,
            endX: pos.x + pos.width,
            endY: curY,
          }),
        );

        for (const attr of cls.attrs) {
          elements.push(
            createText({
              id: `attr-${cls.name}-${attr.split(":")[0].trim()}`,
              x: pos.x + PADDING_X,
              y: curY + 4,
              text: attr,
              fontSize: 14,
              fontFamily: 3,
            }),
          );
          curY += ROW_H;
        }

        curY += SEP_H;
        elements.push(
          createLine({
            id: `sep2-${cls.name}`,
            startX: pos.x,
            startY: curY - SEP_H / 2,
            endX: pos.x + pos.width,
            endY: curY - SEP_H / 2,
          }),
        );

        for (const method of cls.methods) {
          elements.push(
            createText({
              id: `method-${cls.name}-${method.split("(")[0].trim()}`,
              x: pos.x + PADDING_X,
              y: curY,
              text: method,
              fontSize: 14,
              fontFamily: 3,
            }),
          );
          curY += ROW_H;
        }
      }

      // Inheritance arrow
      const sourcePos = layout.nodes.get("Dog")!;
      const targetPos = layout.nodes.get("Animal")!;
      const edgePoints = layout.edges.get("inheritance");
      const points = buildArrowPoints(sourcePos, targetPos, edgePoints?.points);

      elements.push(
        createArrow({
          id: "arrow-dog-extends-animal",
          points,
          endArrowhead: styles.inheritance.endArrowhead,
          strokeStyle: styles.inheritance.strokeStyle,
          startBinding: { elementId: "class-Dog" },
          endBinding: { elementId: "class-Animal" },
        }),
      );

      return elements;
    }

    const generated = generateClassDiagram();
    const golden = loadOrCreateGolden("class-diagram", generateClassDiagram);

    assert.equal(
      (generated as unknown[]).length,
      (golden as unknown[]).length,
      "Element count should match golden file",
    );

    const validation = validateElements(generated);
    assert.equal(validation.valid, true, "Generated diagram should be valid");

    const generatedTypes = (generated as Array<{ type: string }>).map((e) => e.type);
    const goldenTypes = (golden as Array<{ type: string }>).map((e) => e.type);
    assert.deepEqual(generatedTypes, goldenTypes, "Element types should match golden file");
  });
});
