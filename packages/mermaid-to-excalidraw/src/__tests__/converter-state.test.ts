import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { convertStateDiagram } from "../converter/state.js";

describe("convertStateDiagram", () => {
  it("converts simple state machine to elements", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: start
    Processing --> Done: complete
    Done --> [*]`);

    assert.equal(result.diagramType, "stateDiagram");
    assert.ok(result.elements.length > 0);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 4, "Should have 4 transitions");
  });

  it("renders start states as filled ellipses", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    [*] --> Idle`);

    const ellipses = result.elements.filter((e) => e.type === "ellipse");
    assert.ok(ellipses.length >= 1, "Should have start ellipse");
    assert.equal(ellipses[0].backgroundColor, "#333333");
  });

  it("renders normal states as rounded rectangles", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    [*] --> Idle
    Idle --> Done`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const stateRects = rects.filter((r) => r.strokeColor === "#5b8fc9");
    assert.ok(stateRects.length >= 2, "Should have state rectangles with theme color");
  });

  it("renders choice as diamond", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    state decision <<choice>>
    [*] --> decision
    decision --> A: yes
    decision --> B: no`);

    const diamonds = result.elements.filter((e) => e.type === "diamond");
    assert.equal(diamonds.length, 1);
    assert.equal(diamonds[0].strokeColor, "#c4a94d");
  });

  it("renders fork/join as filled rectangles", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    state split <<fork>>
    state merge <<join>>
    [*] --> split
    split --> A
    split --> B
    A --> merge
    B --> merge
    merge --> [*]`);

    // Fork and join are narrow filled rects
    const rects = result.elements.filter((e) => e.type === "rectangle");
    const forkJoinRects = rects.filter((r) => r.backgroundColor === "#333333");
    assert.ok(forkJoinRects.length >= 2, "Should have fork and join bars");
  });

  it("renders composite states as dashed containers", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Running
        Running --> Paused: pause
        Paused --> Running: resume
    }
    Active --> [*]`);

    const rects = result.elements.filter((e) => e.type === "rectangle");
    const dashedRects = rects.filter((r) => r.strokeStyle === "dashed");
    assert.ok(dashedRects.length >= 1, "Should have dashed composite container");
  });

  it("renders transition labels", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    Idle --> Processing: start event`);

    const arrows = result.elements.filter((e) => e.type === "arrow");
    assert.equal(arrows.length, 1);
    const label = arrows[0].label as { text: string } | undefined;
    assert.ok(label);
    assert.equal(label.text, "start event");
  });

  it("applies state theme colors", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    [*] --> Idle`);

    // Normal state should have blue-grey theme
    const rects = result.elements.filter((e) => e.type === "rectangle");
    const stateRects = rects.filter((r) => r.strokeColor === "#5b8fc9");
    assert.ok(stateRects.length >= 1);
  });

  it("converts playground Simple State Machine without errors", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: start
    Processing --> Done: complete
    Processing --> Error: fail
    Error --> Idle: reset
    Done --> [*]`);

    assert.ok(result.elements.length > 0);
    assert.equal(result.diagramType, "stateDiagram");
  });

  it("converts playground Composite States without errors", async () => {
    const result = await convertStateDiagram(`stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Running
        Running --> Paused: pause
        Paused --> Running: resume
    }
    Active --> Terminated: kill
    Terminated --> [*]`);

    assert.ok(result.elements.length > 0);

    // Should have composite container + child states + transitions
    const rects = result.elements.filter((e) => e.type === "rectangle");
    assert.ok(rects.length >= 3, "Should have container + child state rects");
  });
});
