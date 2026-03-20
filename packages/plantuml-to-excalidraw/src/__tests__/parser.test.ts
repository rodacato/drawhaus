import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  detectDiagramType,
  parsePlantUML,
  PlantUMLParseError,
  PlantUMLUnsupportedError,
} from "../parser/index.js";
import type { ClassDiagramAST, ObjectDiagramAST, UseCaseDiagramAST, StateDiagramAST, ComponentDiagramAST } from "../parser/types.js";

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

  test("detects use case diagram with actor (no sequence arrows)", () => {
    assert.equal(detectDiagramType("@startuml\nactor Bob\n@enduml"), "usecase");
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

// ── Object Diagram Parser Tests ─────────────────────────────────

describe("detectDiagramType - object", () => {
  test("detects object diagram with object keyword", () => {
    assert.equal(detectDiagramType("@startuml\nobject user\n@enduml"), "object");
  });

  test("detects object diagram with map keyword", () => {
    assert.equal(detectDiagramType("@startuml\nmap Cities {\n}\n@enduml"), "object");
  });
});

describe("parsePlantUML - object diagrams", () => {
  function parseObject(code: string): ObjectDiagramAST {
    const ast = parsePlantUML(code);
    assert.equal(ast.type, "object");
    return ast as ObjectDiagramAST;
  }

  test("parses a simple object with fields", () => {
    const code = `@startuml
object user {
  name = "Alice"
  id = 123
}
@enduml`;
    const ast = parseObject(code);
    assert.equal(ast.entities.length, 1);
    assert.equal(ast.entities[0].kind, "object");
    assert.equal(ast.entities[0].name, "user");
    assert.equal(ast.entities[0].fields.length, 2);
    assert.equal(ast.entities[0].fields[0].key, "name");
    assert.equal(ast.entities[0].fields[0].separator, "=");
  });

  test("parses object with instanceOf", () => {
    const code = "@startuml\nobject bob : Person\n@enduml";
    const ast = parseObject(code);
    assert.equal(ast.entities[0].instanceOf, "Person");
  });

  test("parses a map with key => value entries", () => {
    const code = `@startuml
map CapitalCity {
  UK => London
  USA => Washington
}
@enduml`;
    const ast = parseObject(code);
    assert.equal(ast.entities[0].kind, "map");
    assert.equal(ast.entities[0].fields.length, 2);
    assert.equal(ast.entities[0].fields[0].separator, "=>");
    assert.equal(ast.entities[0].fields[0].key, "UK");
    assert.equal(ast.entities[0].fields[0].value, "London");
  });

  test("parses relations between objects", () => {
    const code = "@startuml\nobject a\nobject b\na --> b\n@enduml";
    const ast = parseObject(code);
    assert.equal(ast.relations.length, 1);
    assert.equal(ast.relations[0].left, "a");
    assert.equal(ast.relations[0].right, "b");
    assert.equal(ast.relations[0].relationType, "directed_association");
  });

  test("parses relation with label", () => {
    const code = "@startuml\nobject a\nobject b\na --> b : owns\n@enduml";
    const ast = parseObject(code);
    assert.equal(ast.relations[0].label, "owns");
  });

  test("parses multiple objects and maps together", () => {
    const code = `@startuml
object user {
  name = "Bob"
}
map settings {
  theme => dark
  lang => en
}
user --> settings
@enduml`;
    const ast = parseObject(code);
    assert.equal(ast.entities.length, 2);
    assert.equal(ast.relations.length, 1);
  });

  test("parses object without body", () => {
    const code = "@startuml\nobject empty\n@enduml";
    const ast = parseObject(code);
    assert.equal(ast.entities[0].fields.length, 0);
  });
});

// ── Use Case Diagram Parser Tests ───────────────────────────────

describe("detectDiagramType - usecase", () => {
  test("detects use case with usecase keyword", () => {
    assert.equal(detectDiagramType('@startuml\nusecase "Login"\n@enduml'), "usecase");
  });

  test("detects use case with actor without sequence arrows", () => {
    assert.equal(detectDiagramType("@startuml\nactor User\n@enduml"), "usecase");
  });
});

describe("parsePlantUML - use case diagrams", () => {
  function parseUseCase(code: string): UseCaseDiagramAST {
    const ast = parsePlantUML(code);
    assert.equal(ast.type, "usecase");
    return ast as UseCaseDiagramAST;
  }

  test("parses actor declaration", () => {
    const code = "@startuml\nactor Alice\n@enduml";
    const ast = parseUseCase(code);
    assert.equal(ast.actors.length, 1);
    assert.equal(ast.actors[0].name, "Alice");
  });

  test("parses actor with alias", () => {
    const code = '@startuml\nactor "Alice Smith" as alice\n@enduml';
    const ast = parseUseCase(code);
    assert.equal(ast.actors[0].name, "Alice Smith");
    assert.equal(ast.actors[0].alias, "alice");
  });

  test("parses usecase declaration", () => {
    const code = '@startuml\nusecase "Login"\n@enduml';
    const ast = parseUseCase(code);
    assert.equal(ast.useCases.length, 1);
    assert.equal(ast.useCases[0].name, "Login");
  });

  test("parses usecase with alias", () => {
    const code = '@startuml\nusecase "Login to System" as UC1\n@enduml';
    const ast = parseUseCase(code);
    assert.equal(ast.useCases[0].name, "Login to System");
    assert.equal(ast.useCases[0].alias, "UC1");
  });

  test("parses boundary with nested use cases", () => {
    const code = `@startuml
actor User
rectangle System {
  usecase "Login" as UC1
  usecase "Logout" as UC2
}
User --> UC1
@enduml`;
    const ast = parseUseCase(code);
    assert.equal(ast.boundaries.length, 1);
    assert.equal(ast.boundaries[0].name, "System");
    assert.equal(ast.useCases.filter(uc => uc.boundary === "System").length, 2);
  });

  test("parses simple relation", () => {
    const code = "@startuml\nactor User\nusecase Login\nUser --> Login\n@enduml";
    const ast = parseUseCase(code);
    assert.equal(ast.relations.length, 1);
    assert.equal(ast.relations[0].relationType, "directed");
  });

  test("parses include stereotype", () => {
    const code = '@startuml\nusecase Login\nusecase Auth\nLogin ..> Auth : <<include>>\n@enduml';
    const ast = parseUseCase(code);
    assert.equal(ast.relations[0].relationType, "include");
    assert.equal(ast.relations[0].stereotype, "include");
  });

  test("parses extend stereotype", () => {
    const code = '@startuml\nusecase Login\nusecase SSO\nSSO ..> Login : <<extend>>\n@enduml';
    const ast = parseUseCase(code);
    assert.equal(ast.relations[0].relationType, "extend");
  });

  test("parses left to right direction", () => {
    const code = "@startuml\nleft to right direction\nactor User\n@enduml";
    const ast = parseUseCase(code);
    assert.equal(ast.direction, "LR");
  });

  test("ignores skinparam lines", () => {
    const code = "@startuml\nskinparam packageStyle rectangle\nactor User\n@enduml";
    const ast = parseUseCase(code);
    assert.equal(ast.actors.length, 1);
  });

  test("parses association (no arrow)", () => {
    const code = "@startuml\nactor User\nusecase Login\nUser -- Login\n@enduml";
    const ast = parseUseCase(code);
    assert.equal(ast.relations[0].relationType, "association");
  });
});

// ── Fallback Parser Tests ──────────────────────────────────────

describe("parsePlantUML - fallback mechanism", () => {
  test("unsupported type still throws PlantUMLUnsupportedError", () => {
    const code = "@startuml\nparticipant Alice\n@enduml";
    assert.throws(() => parsePlantUML(code), PlantUMLUnsupportedError);
  });

  test("unknown type throws PlantUMLUnsupportedError", () => {
    assert.throws(() => parsePlantUML("gibberish"), PlantUMLUnsupportedError);
  });

  test("valid class diagram parses on first try", () => {
    const code = "@startuml\nclass Foo {\n  +bar: String\n}\n@enduml";
    const ast = parsePlantUML(code);
    assert.equal(ast.type, "class");
  });

  test("valid object diagram parses on first try", () => {
    const code = "@startuml\nobject foo {\n  bar = 1\n}\n@enduml";
    const ast = parsePlantUML(code);
    assert.equal(ast.type, "object");
  });

  test("valid state diagram parses on first try", () => {
    const code = "@startuml\n[*] --> Idle\nIdle --> [*]\n@enduml";
    const ast = parsePlantUML(code);
    assert.equal(ast.type, "state");
  });
});

// ── State Diagram Parser Tests ──────────────────────────────────

describe("detectDiagramType - state", () => {
  test("detects state diagram with state keyword", () => {
    assert.equal(detectDiagramType("@startuml\nstate Idle\n@enduml"), "state");
  });

  test("detects state diagram with [*] pseudo-state", () => {
    assert.equal(detectDiagramType("@startuml\n[*] --> Idle\n@enduml"), "state");
  });
});

describe("parsePlantUML - state diagrams", () => {
  function parseState(code: string): StateDiagramAST {
    const ast = parsePlantUML(code);
    assert.equal(ast.type, "state");
    return ast as StateDiagramAST;
  }

  test("parses simple state transitions", () => {
    const code = `@startuml
[*] --> Idle
Idle --> Processing : start
Processing --> [*]
@enduml`;
    const ast = parseState(code);
    assert.equal(ast.states.length, 2); // Idle, Processing (implicit)
    assert.equal(ast.transitions.length, 3);
    assert.equal(ast.transitions[0].from, "[*]");
    assert.equal(ast.transitions[0].to, "Idle");
    assert.equal(ast.transitions[1].label, "start");
  });

  test("parses state with label", () => {
    const code = `@startuml
state "Not Started" as NS
[*] --> NS
@enduml`;
    const ast = parseState(code);
    const ns = ast.states.find(s => s.name === "NS");
    assert.ok(ns);
    assert.equal(ns!.kind, "simple");
    if (ns!.kind === "simple") {
      assert.equal(ns!.label, "Not Started");
    }
  });

  test("parses state with description", () => {
    const code = `@startuml
state Idle : waiting for input
[*] --> Idle
@enduml`;
    const ast = parseState(code);
    const idle = ast.states.find(s => s.name === "Idle");
    assert.ok(idle);
    if (idle!.kind === "simple") {
      assert.equal(idle!.description, "waiting for input");
    }
  });

  test("parses composite state", () => {
    const code = `@startuml
[*] --> Active
state Active {
  [*] --> Running
  Running --> Paused : pause
  Paused --> Running : resume
  Running --> [*]
}
Active --> [*]
@enduml`;
    const ast = parseState(code);

    const active = ast.states.find(s => s.name === "Active");
    assert.ok(active);
    assert.equal(active!.kind, "composite");
    if (active!.kind === "composite") {
      assert.equal(active!.children.length, 2); // Running, Paused
      assert.equal(active!.transitions.length, 4);
    }

    // Top-level transitions
    assert.equal(ast.transitions.length, 2);
  });

  test("parses composite state with label", () => {
    const code = `@startuml
state "Processing Phase" as Proc {
  [*] --> Step1
  Step1 --> [*]
}
@enduml`;
    const ast = parseState(code);
    const proc = ast.states.find(s => s.name === "Proc");
    assert.ok(proc);
    assert.equal(proc!.kind, "composite");
    if (proc!.kind === "composite") {
      assert.equal(proc!.label, "Processing Phase");
      assert.equal(proc!.transitions.length, 2);
    }
  });

  test("creates implicit states from transitions", () => {
    const code = `@startuml
[*] --> A
A --> B : go
B --> C
@enduml`;
    const ast = parseState(code);
    assert.equal(ast.states.length, 3); // A, B, C
    assert.equal(ast.transitions.length, 3);
  });

  test("ignores comments", () => {
    const code = `@startuml
' This is a comment
[*] --> Idle
/' block comment '/
Idle --> [*]
@enduml`;
    const ast = parseState(code);
    assert.equal(ast.transitions.length, 2);
  });

  test("ignores hide and skinparam directives", () => {
    const code = `@startuml
hide empty description
skinparam state {
  BackgroundColor LightBlue
}
[*] --> Active
Active --> [*]
@enduml`;
    const ast = parseState(code);
    assert.equal(ast.transitions.length, 2);
  });
});

// ── Component Diagram Parser Tests ──────────────────────────────

describe("detectDiagramType - component", () => {
  test("detects component diagram with bracket syntax", () => {
    assert.equal(detectDiagramType("@startuml\n[Web App] --> [API]\n@enduml"), "component");
  });

  test("detects component diagram with component keyword", () => {
    assert.equal(detectDiagramType("@startuml\ncomponent Foo\n@enduml"), "component");
  });

  test("detects component diagram with package container", () => {
    assert.equal(detectDiagramType("@startuml\npackage Backend {\n}\n@enduml"), "component");
  });
});

describe("parsePlantUML - component diagrams", () => {
  function parseComponent(code: string): ComponentDiagramAST {
    const ast = parsePlantUML(code);
    assert.equal(ast.type, "component");
    return ast as ComponentDiagramAST;
  }

  test("parses bracket component syntax", () => {
    const code = `@startuml
[Web App] --> [API]
@enduml`;
    const ast = parseComponent(code);
    assert.equal(ast.components.length, 2);
    assert.equal(ast.relations.length, 1);
    assert.equal(ast.relations[0].left, "Web App");
    assert.equal(ast.relations[0].right, "API");
  });

  test("parses component keyword", () => {
    const code = `@startuml
component MyService
[Client] --> MyService
@enduml`;
    const ast = parseComponent(code);
    assert.ok(ast.components.some(c => c.name === "MyService"));
  });

  test("parses package container with children", () => {
    const code = `@startuml
package "Backend" {
  [Controller] --> [Service]
}
@enduml`;
    const ast = parseComponent(code);
    assert.equal(ast.containers.length, 1);
    assert.equal(ast.containers[0].kind, "package");
    assert.equal(ast.containers[0].name, "Backend");
    assert.equal(ast.containers[0].children.length, 2);
  });

  test("parses database container", () => {
    const code = `@startuml
database "MySQL" {
  [Users]
}
@enduml`;
    const ast = parseComponent(code);
    assert.equal(ast.containers[0].kind, "database");
    assert.equal(ast.containers[0].children.length, 1);
  });

  test("parses nested containers", () => {
    const code = `@startuml
cloud "AWS" {
  node "EC2" {
    [App]
  }
}
@enduml`;
    const ast = parseComponent(code);
    assert.equal(ast.containers.length, 1);
    assert.equal(ast.containers[0].kind, "cloud");
    assert.equal(ast.containers[0].childContainers.length, 1);
    assert.equal(ast.containers[0].childContainers[0].kind, "node");
  });

  test("parses relation with label", () => {
    const code = `@startuml
[App] --> [DB] : JDBC
@enduml`;
    const ast = parseComponent(code);
    assert.equal(ast.relations[0].label, "JDBC");
  });

  test("parses dependency relation", () => {
    const code = `@startuml
[App] ..> [Config] : uses
@enduml`;
    const ast = parseComponent(code);
    assert.equal(ast.relations[0].relationType, "dependency");
  });

  test("components from relations inside containers are registered", () => {
    const code = `@startuml
package "API" {
  [Handler] --> [Logic]
}
@enduml`;
    const ast = parseComponent(code);
    // Handler and Logic should appear as both container children and global components
    assert.ok(ast.components.some(c => c.name === "Handler"));
    assert.ok(ast.components.some(c => c.name === "Logic"));
    assert.equal(ast.containers[0].children.length, 2);
  });
});
