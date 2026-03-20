import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  detectDiagramType,
  parsePlantUML,
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "../lib/diagram-code/plantuml-parser";
import type { ClassDiagramAST } from "../lib/diagram-code/plantuml-parser/types";

function parseClass(code: string): ClassDiagramAST {
  const ast = parsePlantUML(code);
  assert.equal(ast.type, "class");
  return ast as ClassDiagramAST;
}

// ── detectDiagramType ────────────────────────────────────────

describe("detectDiagramType", () => {
  test("detects class diagram with class keyword", () => {
    assert.equal(detectDiagramType("@startuml\nclass Foo\n@enduml"), "class");
  });

  test("detects class diagram with interface keyword", () => {
    assert.equal(detectDiagramType("@startuml\ninterface IFoo\n@enduml"), "class");
  });

  test("detects class diagram with enum keyword", () => {
    assert.equal(detectDiagramType("@startuml\nenum Color\n@enduml"), "class");
  });

  test("detects sequence diagram with participant", () => {
    assert.equal(detectDiagramType("@startuml\nparticipant Alice\n@enduml"), "sequence");
  });

  test("detects sequence diagram with actor", () => {
    assert.equal(detectDiagramType("@startuml\nactor Bob\n@enduml"), "sequence");
  });

  test("detects sequence diagram with arrow syntax", () => {
    assert.equal(detectDiagramType("@startuml\nAlice -> Bob: hello\n@enduml"), "sequence");
  });

  test("detects activity diagram with action syntax", () => {
    assert.equal(detectDiagramType("@startuml\n:action;\n@enduml"), "activity");
  });

  test("detects activity diagram with start keyword", () => {
    assert.equal(detectDiagramType("@startuml\nstart\n:do thing;\nstop\n@enduml"), "activity");
  });

  test("returns unknown for empty input", () => {
    assert.equal(detectDiagramType(""), "unknown");
  });

  test("returns unknown for unrecognized syntax", () => {
    assert.equal(detectDiagramType("@startuml\nfoo bar baz\n@enduml"), "unknown");
  });

  test("ignores single-line comments when detecting type", () => {
    const code = "@startuml\n'class Foo\n@enduml";
    assert.equal(detectDiagramType(code), "unknown");
  });

  test("ignores block comments when detecting type", () => {
    const code = "@startuml\n/' class Foo '/\n@enduml";
    assert.equal(detectDiagramType(code), "unknown");
  });
});

// ── parsePlantUML ────────────────────────────────────────────

describe("parsePlantUML", () => {
  test("parses a simple class diagram", () => {
    const code = "@startuml\nclass User {\n  +name: String\n}\n@enduml";
    const ast = parseClass(code);
    assert.equal(ast.entities.length, 1);
    assert.equal(ast.entities[0].name, "User");
    assert.equal(ast.entities[0].kind, "class");
    assert.equal(ast.entities[0].members.length, 1);
    assert.equal(ast.entities[0].members[0].name, "name");
  });

  test("parses interface entity", () => {
    const code = "@startuml\ninterface Serializable {\n  +serialize(): String\n}\n@enduml";
    const ast = parseClass(code);
    assert.equal(ast.entities[0].kind, "interface");
    assert.equal(ast.entities[0].members[0].kind, "method");
  });

  test("parses enum entity", () => {
    const code = "@startuml\nenum Color {\n  RED\n  GREEN\n  BLUE\n}\n@enduml";
    const ast = parseClass(code);
    assert.equal(ast.entities[0].kind, "enum");
    assert.equal(ast.entities[0].members.length, 3);
    assert.equal(ast.entities[0].members[0].kind, "enum_value");
  });

  test("parses relations between classes", () => {
    const code = "@startuml\nclass A\nclass B\nA --|> B\n@enduml";
    const ast = parseClass(code);
    assert.equal(ast.relations.length, 1);
    assert.equal(ast.relations[0].left, "A");
    assert.equal(ast.relations[0].right, "B");
    assert.equal(ast.relations[0].relationType, "inheritance");
  });

  test("parses relation with label", () => {
    const code = '@startuml\nclass A\nclass B\nA --> B : uses\n@enduml';
    const ast = parseClass(code);
    assert.equal(ast.relations[0].label, "uses");
  });

  test("throws PlantUMLUnsupportedError for sequence diagrams", () => {
    const code = "@startuml\nparticipant Alice\n@enduml";
    assert.throws(() => parsePlantUML(code), PlantUMLUnsupportedError);
  });

  test("throws PlantUMLUnsupportedError for activity diagrams", () => {
    const code = "@startuml\nstart\n:action;\nstop\n@enduml";
    assert.throws(() => parsePlantUML(code), PlantUMLUnsupportedError);
  });

  test("throws PlantUMLUnsupportedError for unknown diagrams", () => {
    assert.throws(() => parsePlantUML("@startuml\nfoo\n@enduml"), PlantUMLUnsupportedError);
  });

  test("PlantUMLParseError includes line and column info", () => {
    try {
      parsePlantUML("@startuml\nclass {\n@enduml");
      assert.fail("Expected PlantUMLParseError");
    } catch (err) {
      assert.ok(err instanceof PlantUMLParseError);
      assert.equal(typeof err.line, "number");
      assert.equal(typeof err.column, "number");
    }
  });

  test("parses multiple entities and relations", () => {
    const code = `@startuml
class Animal {
  +name: String
  +speak(): void
}
class Dog {
  +breed: String
}
Dog --|> Animal
@enduml`;
    const ast = parseClass(code);
    assert.equal(ast.entities.length, 2);
    assert.equal(ast.relations.length, 1);
  });

  test("parses member visibility markers", () => {
    const code = `@startuml
class Foo {
  +public: String
  -private: int
  #protected: bool
  ~package: float
}
@enduml`;
    const ast = parseClass(code);
    const members = ast.entities[0].members;
    assert.equal(members[0].visibility, "+");
    assert.equal(members[1].visibility, "-");
    assert.equal(members[2].visibility, "#");
    assert.equal(members[3].visibility, "~");
  });
});
