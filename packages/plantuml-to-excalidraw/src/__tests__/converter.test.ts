import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { parsePlantUMLToExcalidraw, PlantUMLUnsupportedError } from "../index.js";

describe("parsePlantUMLToExcalidraw", () => {
  test("returns empty elements for empty input", () => {
    const result = parsePlantUMLToExcalidraw("");
    assert.deepEqual(result.elements, []);
    assert.equal(result.diagramType, "unknown");
  });

  test("returns empty elements for whitespace-only input", () => {
    const result = parsePlantUMLToExcalidraw("   \n  \n  ");
    assert.deepEqual(result.elements, []);
  });

  test("converts a single class to excalidraw elements", () => {
    const code = "@startuml\nclass User {\n  +name: String\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    assert.equal(result.diagramType, "class");
    assert.ok(result.elements.length > 0);

    // Should contain at least a rectangle (class box) and text elements
    const types = result.elements.map((e) => e.type);
    assert.ok(types.includes("rectangle"), "should have a rectangle for the class box");
    assert.ok(types.includes("text"), "should have text elements for name/members");
  });

  test("generates deterministic element IDs across calls", () => {
    const code = "@startuml\nclass Foo\n@enduml";
    const result1 = parsePlantUMLToExcalidraw(code);
    const result2 = parsePlantUMLToExcalidraw(code);

    // IDs contain a counter that resets — the counter part should match
    const id1 = result1.elements[0].id as string;
    const id2 = result2.elements[0].id as string;
    // Both should start with plantuml_ and have counter _1
    assert.ok(id1.startsWith("plantuml_"));
    assert.ok(id2.startsWith("plantuml_"));
    // Counter part (after last _) should be the same
    assert.equal(id1.split("_").pop(), id2.split("_").pop());
  });

  test("renders class with attributes and methods", () => {
    const code = `@startuml
class User {
  +name: String
  -email: String
  +getName(): String
}
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const texts = result.elements
      .filter((e) => e.type === "text")
      .map((e) => e.text as string);

    assert.ok(texts.some((t) => t.includes("User")), "should have class name");
    assert.ok(texts.some((t) => t.includes("name")), "should have attribute");
    assert.ok(texts.some((t) => t.includes("getName")), "should have method");
  });

  test("renders interface with dashed border style", () => {
    const code = "@startuml\ninterface Serializable {\n  +serialize(): String\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length > 0);
    assert.equal(rects[0].strokeStyle, "dashed");
  });

  test("renders enum with proper stereotype", () => {
    const code = "@startuml\nenum Color {\n  RED\n  GREEN\n  BLUE\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const texts = result.elements
      .filter((e) => e.type === "text")
      .map((e) => e.text as string);

    assert.ok(texts.some((t) => t.includes("«enumeration»")));
    assert.ok(texts.some((t) => t === "RED"));
  });

  test("renders relations as arrows", () => {
    const code = `@startuml
class Animal
class Dog
Dog --|> Animal
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].endArrowhead, "triangle");
    assert.equal(arrows[0].strokeStyle, "solid");
  });

  test("renders implementation relation as dashed arrow with triangle", () => {
    const code = `@startuml
interface IAnimal
class Dog
Dog ..|> IAnimal
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].endArrowhead, "triangle");
    assert.equal(arrows[0].strokeStyle, "dashed");
  });

  test("renders composition relation as arrow with diamond", () => {
    const code = `@startuml
class Car
class Engine
Car *-- Engine
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    // composition: diamond on one end
    const arrow = arrows[0];
    const hasDiamond =
      arrow.startArrowhead === "diamond" || arrow.endArrowhead === "diamond";
    assert.ok(hasDiamond, "composition should have a diamond arrowhead");
  });

  test("renders multiple classes with proper layout", () => {
    const code = `@startuml
class A
class B
class C
A --> B
B --> C
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects.length, 3);

    // Each class should have a distinct position
    const positions = rects.map((r) => ({ x: r.x, y: r.y }));
    const uniquePositions = new Set(positions.map((p) => `${p.x},${p.y}`));
    assert.equal(uniquePositions.size, 3, "each class should have a unique position");
  });

  test("throws PlantUMLUnsupportedError for sequence diagram", () => {
    const code = "@startuml\nparticipant Alice\n@enduml";
    assert.throws(() => parsePlantUMLToExcalidraw(code), PlantUMLUnsupportedError);
  });

  test("includes separator lines between sections", () => {
    const code = `@startuml
class Foo {
  +attr: String
  +method(): void
}
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const lines = result.elements.filter((e) => e.type === "line");
    assert.ok(lines.length >= 1, "should have separator lines between header/attrs/methods");
  });
});

// ── Object Diagram Converter Tests ──────────────────────────────

describe("parsePlantUMLToExcalidraw - object diagrams", () => {
  test("converts a simple object to rectangle + text", () => {
    const code = `@startuml
object user {
  name = "Alice"
  id = 123
}
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);
    assert.equal(result.diagramType, "object");
    assert.ok(result.elements.length > 0);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects.length, 1);

    const texts = result.elements.filter((e) => e.type === "text");
    assert.ok(texts.length >= 3); // header + 2 fields
  });

  test("renders object with instanceOf in header", () => {
    const code = "@startuml\nobject bob : Person\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const texts = result.elements.filter((e) => e.type === "text");
    const headerText = texts.find((t) => typeof t.text === "string" && t.text.includes("Person"));
    assert.ok(headerText, "header should show instanceOf type");
  });

  test("converts a map with key-value entries", () => {
    const code = `@startuml
map CapitalCity {
  UK => London
  USA => Washington
}
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const texts = result.elements.filter((e) => e.type === "text");
    const mapEntry = texts.find((t) => typeof t.text === "string" && t.text.includes("=>"));
    assert.ok(mapEntry, "should render map entries with => separator");
  });

  test("renders relations between objects as arrows", () => {
    const code = "@startuml\nobject a\nobject b\na --> b : owns\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
  });

  test("multiple objects have unique positions", () => {
    const code = "@startuml\nobject a\nobject b\nobject c\na --> b\nb --> c\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.equal(rects.length, 3);
    const positions = new Set(rects.map((r) => `${r.x},${r.y}`));
    assert.equal(positions.size, 3);
  });
});

// ── Use Case Diagram Converter Tests ────────────────────────────

describe("parsePlantUMLToExcalidraw - use case diagrams", () => {
  test("converts actor to rectangle with actor stereotype", () => {
    const code = "@startuml\nactor User\nusecase Login\nUser --> Login\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);
    assert.equal(result.diagramType, "usecase");

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length >= 1, "actors render as rectangles");

    const texts = result.elements.filter((e) => e.type === "text");
    const actorLabel = texts.find((t) => typeof t.text === "string" && t.text.includes("actor"));
    assert.ok(actorLabel, "actor should have «actor» stereotype text");
  });

  test("converts use case to ellipse", () => {
    const code = "@startuml\nactor User\nusecase Login\nUser --> Login\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const ellipses = result.elements.filter((e) => e.type === "ellipse");
    assert.equal(ellipses.length, 1);
  });

  test("renders directed relation as arrow", () => {
    const code = "@startuml\nactor User\nusecase Login\nUser --> Login\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].endArrowhead, "arrow");
  });

  test("include relation has dashed style and label", () => {
    const code = '@startuml\nusecase Login\nusecase Auth\nLogin ..> Auth : <<include>>\n@enduml';
    const result = parsePlantUMLToExcalidraw(code);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    assert.equal(arrows[0].strokeStyle, "dashed");
  });

  test("boundary renders as dashed rectangle", () => {
    const code = `@startuml
actor User
rectangle System {
  usecase Login
}
User --> Login
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const dashedRects = result.elements.filter(
      (e) => e.type === "rectangle" && e.strokeStyle === "dashed",
    );
    assert.ok(dashedRects.length >= 1, "boundary should be a dashed rectangle");
  });

  test("multiple actors and use cases have unique positions", () => {
    const code = `@startuml
actor User
actor Admin
usecase Login
usecase Dashboard
User --> Login
Admin --> Dashboard
@enduml`;
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const ellipses = result.elements.filter((e) => e.type === "ellipse");
    const all = [...rects, ...ellipses];
    const positions = new Set(all.map((e) => `${e.x},${e.y}`));
    assert.equal(positions.size, all.length, "all elements should have unique positions");
  });
});
