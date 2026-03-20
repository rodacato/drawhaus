import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { parsePlantUMLToExcalidraw } from "../lib/diagram-code/plantuml-to-excalidraw";
import { PlantUMLUnsupportedError } from "../lib/diagram-code/plantuml-parser";

describe("parsePlantUMLToExcalidraw", () => {
  test("returns empty elements for empty input", () => {
    const result = parsePlantUMLToExcalidraw("");
    assert.deepEqual(result.elements, []);
    assert.equal(result.diagramType, "unknown");
    assert.equal(result.isFallback, false);
  });

  test("returns empty elements for whitespace-only input", () => {
    const result = parsePlantUMLToExcalidraw("   \n  \n  ");
    assert.deepEqual(result.elements, []);
  });

  test("converts a single class to excalidraw elements", () => {
    const code = "@startuml\nclass User {\n  +name: String\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    assert.equal(result.diagramType, "class");
    assert.equal(result.isFallback, false);
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
      .map((e) => (e as any).text);

    assert.ok(texts.some((t: string) => t.includes("User")), "should have class name");
    assert.ok(texts.some((t: string) => t.includes("name")), "should have attribute");
    assert.ok(texts.some((t: string) => t.includes("getName")), "should have method");
  });

  test("renders interface with dashed border style", () => {
    const code = "@startuml\ninterface Serializable {\n  +serialize(): String\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length > 0);
    assert.equal((rects[0] as any).strokeStyle, "dashed");
  });

  test("renders enum with proper stereotype", () => {
    const code = "@startuml\nenum Color {\n  RED\n  GREEN\n  BLUE\n}\n@enduml";
    const result = parsePlantUMLToExcalidraw(code);

    const texts = result.elements
      .filter((e) => e.type === "text")
      .map((e) => (e as any).text);

    assert.ok(texts.some((t: string) => t.includes("«enumeration»")));
    assert.ok(texts.some((t: string) => t === "RED"));
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
    assert.equal((arrows[0] as any).endArrowhead, "triangle");
    assert.equal((arrows[0] as any).strokeStyle, "solid");
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
    assert.equal((arrows[0] as any).endArrowhead, "triangle");
    assert.equal((arrows[0] as any).strokeStyle, "dashed");
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
    const arrow = arrows[0] as any;
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
    const positions = rects.map((r) => ({ x: (r as any).x, y: (r as any).y }));
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
