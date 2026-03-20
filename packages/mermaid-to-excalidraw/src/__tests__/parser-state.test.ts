import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMermaidStateDiagram } from "../parser/state.js";

describe("parseMermaidStateDiagram", () => {
  it("parses simple states", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    Idle
    Processing
    Done`);

    assert.equal(ast.states.length, 3);
    assert.equal(ast.states[0].id, "Idle");
    assert.equal(ast.states[0].kind, "normal");
  });

  it("parses state with description", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    Moving: Object is moving`);

    assert.equal(ast.states.length, 1);
    assert.equal(ast.states[0].id, "Moving");
    assert.equal(ast.states[0].description, "Object is moving");
  });

  it("parses state with label (as syntax)", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    state "My Custom State" as mystate`);

    assert.equal(ast.states.length, 1);
    assert.equal(ast.states[0].id, "mystate");
    assert.equal(ast.states[0].label, "My Custom State");
  });

  it("parses start and end pseudo-states", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    [*] --> Idle
    Done --> [*]`);

    assert.equal(ast.transitions.length, 2);

    // Start pseudo-state
    const startState = ast.states.find((s) => s.kind === "start");
    assert.ok(startState);

    // End pseudo-state
    const endState = ast.states.find((s) => s.kind === "end");
    assert.ok(endState);
  });

  it("parses transitions with labels", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    Idle --> Processing: start
    Processing --> Done: complete`);

    assert.equal(ast.transitions.length, 2);
    assert.equal(ast.transitions[0].label, "start");
    assert.equal(ast.transitions[1].label, "complete");
  });

  it("parses transitions without labels", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    A --> B`);

    assert.equal(ast.transitions.length, 1);
    assert.equal(ast.transitions[0].label, undefined);
  });

  it("parses choice pseudo-state", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    state decision <<choice>>
    [*] --> decision`);

    const choice = ast.states.find((s) => s.id === "decision");
    assert.ok(choice);
    assert.equal(choice.kind, "choice");
  });

  it("parses fork and join pseudo-states", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    state split <<fork>>
    state merge <<join>>
    [*] --> split
    split --> A
    split --> B
    A --> merge
    B --> merge`);

    const fork = ast.states.find((s) => s.id === "split");
    assert.ok(fork);
    assert.equal(fork.kind, "fork");

    const join = ast.states.find((s) => s.id === "merge");
    assert.ok(join);
    assert.equal(join.kind, "join");
  });

  it("parses composite states", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Running
        Running --> Paused: pause
        Paused --> Running: resume
    }
    Active --> [*]`);

    const active = ast.states.find((s) => s.id === "Active");
    assert.ok(active);
    assert.ok(active.children);
    assert.ok(active.children.states.length >= 2); // Running, Paused + start
    assert.ok(active.children.transitions.length >= 2);
  });

  it("parses direction", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    direction LR
    [*] --> A`);

    assert.equal(ast.direction, "LR");
  });

  it("defaults direction to TB", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    [*] --> A`);

    assert.equal(ast.direction, "TB");
  });

  it("handles empty diagram", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2`);
    assert.equal(ast.states.length, 0);
    assert.equal(ast.transitions.length, 0);
  });

  it("skips classDef and class directives", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    classDef active fill:#090
    [*] --> Running
    class Running active`);

    // Should parse the transition, ignore style directives
    assert.equal(ast.transitions.length, 1);
  });

  it("strips inline ::: style annotations", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    [*] --> Running:::active`);

    assert.equal(ast.transitions.length, 1);
    const target = ast.states.find((s) => s.id === "Running");
    assert.ok(target);
  });

  it("parses playground Simple State Machine example", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: start
    Processing --> Done: complete
    Processing --> Error: fail
    Error --> Idle: reset
    Done --> [*]`);

    // States: Idle, Processing, Done, Error + start + end
    assert.ok(ast.states.length >= 4);
    assert.equal(ast.transitions.length, 6);

    const startState = ast.states.find((s) => s.kind === "start");
    assert.ok(startState);
    const endState = ast.states.find((s) => s.kind === "end");
    assert.ok(endState);
  });

  it("parses playground Composite States example", () => {
    const ast = parseMermaidStateDiagram(`stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Running
        Running --> Paused: pause
        Paused --> Running: resume
    }
    Active --> Terminated: kill
    Terminated --> [*]`);

    assert.ok(ast.states.length >= 2); // Active, Terminated + pseudos
    const active = ast.states.find((s) => s.id === "Active");
    assert.ok(active);
    assert.ok(active.children);

    const running = active.children.states.find((s) => s.id === "Running");
    assert.ok(running);
  });
});
