import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { parsePlantUMLToExcalidraw, DEFAULT_THEME, resolveTheme } from "../index.js";
import type { DiagramTheme } from "../theme/types.js";

// ── resolveTheme ────────────────────────────────────────────────

describe("resolveTheme", () => {
  test("returns DEFAULT_THEME when no overrides provided", () => {
    const theme = resolveTheme();
    assert.deepEqual(theme, DEFAULT_THEME);
  });

  test("returns DEFAULT_THEME when undefined passed", () => {
    const theme = resolveTheme(undefined);
    assert.deepEqual(theme, DEFAULT_THEME);
  });

  test("merges partial override into defaults", () => {
    const theme = resolveTheme({
      class: { fill: "#ff0000", stroke: "#000", strokeStyle: "dashed" },
    });

    assert.equal(theme.class.fill, "#ff0000");
    assert.equal(theme.class.stroke, "#000");
    assert.equal(theme.class.strokeStyle, "dashed");
    // Other properties remain default
    assert.equal(theme.interface.fill, DEFAULT_THEME.interface.fill);
    assert.equal(theme.enum.fill, DEFAULT_THEME.enum.fill);
  });

  test("deep merges individual properties", () => {
    const theme = resolveTheme({
      class: { fill: "#custom" } as DiagramTheme["class"],
    });

    // fill is overridden
    assert.equal(theme.class.fill, "#custom");
    // stroke and strokeStyle come from default
    assert.equal(theme.class.stroke, DEFAULT_THEME.class.stroke);
    assert.equal(theme.class.strokeStyle, DEFAULT_THEME.class.strokeStyle);
  });

  test("allows overriding arrow styles", () => {
    const theme = resolveTheme({
      arrow: { stroke: "#red", strokeWidth: 3 },
    });
    assert.equal(theme.arrow.stroke, "#red");
    assert.equal(theme.arrow.strokeWidth, 3);
  });

  test("allows overriding text styles", () => {
    const theme = resolveTheme({
      headerText: { color: "#blue", fontSize: 20 },
    });
    assert.equal(theme.headerText.color, "#blue");
    assert.equal(theme.headerText.fontSize, 20);
  });
});

// ── Theme applied in rendering ──────────────────────────────────

describe("theme applied to rendering", () => {
  test("default theme applies class fill and stroke colors", () => {
    const code = "@startuml\nclass Foo\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length > 0);
    assert.equal(rects[0].backgroundColor, DEFAULT_THEME.class.fill);
    assert.equal(rects[0].strokeColor, DEFAULT_THEME.class.stroke);
  });

  test("custom theme overrides class fill color", () => {
    const code = "@startuml\nclass Foo\n@enduml";
    const result = parsePlantUMLToExcalidraw(code, {
      theme: { class: { fill: "#custom_fill", stroke: "#custom_stroke", strokeStyle: "solid" } },
    });

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects[0].backgroundColor, "#custom_fill");
    assert.equal(rects[0].strokeColor, "#custom_stroke");
  });

  test("interface uses dashed stroke from theme", () => {
    const code = "@startuml\ninterface IFoo\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects[0].strokeStyle, DEFAULT_THEME.interface.strokeStyle);
    assert.equal(rects[0].backgroundColor, DEFAULT_THEME.interface.fill);
  });

  test("enum uses amber fill from theme", () => {
    const code = "@startuml\nenum Color {\n  RED\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects[0].backgroundColor, DEFAULT_THEME.enum.fill);
  });

  test("object diagram uses object theme", () => {
    const code = "@startuml\nobject foo {\n  a = 1\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects[0].backgroundColor, DEFAULT_THEME.object.fill);
    assert.equal(rects[0].strokeColor, DEFAULT_THEME.object.stroke);
  });

  test("use case diagram uses actor and useCase themes", () => {
    const code = "@startuml\nactor User\nusecase Login\nUser --> Login\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const ellipses = result.elements.filter((e) => e.type === "ellipse");

    // Actor rectangle
    assert.ok(rects.some((r) => r.backgroundColor === DEFAULT_THEME.actor.fill));
    // Use case ellipse
    assert.ok(ellipses.some((e) => e.backgroundColor === DEFAULT_THEME.useCase.fill));
  });

  test("custom theme applied to use case diagram", () => {
    const code = "@startuml\nactor User\nusecase Login\nUser --> Login\n@enduml";
    const result = parsePlantUMLToExcalidraw(code, {
      theme: {
        actor: { fill: "#actor_custom", stroke: "#000", strokeStyle: "solid" },
        useCase: { fill: "#uc_custom", stroke: "#000", strokeStyle: "solid" },
      },
    });

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const ellipses = result.elements.filter((e) => e.type === "ellipse");

    assert.ok(rects.some((r) => r.backgroundColor === "#actor_custom"));
    assert.ok(ellipses.some((e) => e.backgroundColor === "#uc_custom"));
  });

  test("separator lines use theme separator style", () => {
    const code = "@startuml\nclass Foo {\n  +bar: String\n  +baz(): void\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const lines = result.elements.filter((e) => e.type === "line");
    assert.ok(lines.length > 0);
    assert.equal(lines[0].strokeColor, DEFAULT_THEME.separator.stroke);
  });
});
