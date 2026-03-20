import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectDiagramType } from "../detect.js";

describe("detectDiagramType", () => {
  it("detects flowchart TD", () => {
    assert.equal(detectDiagramType("flowchart TD\n  A --> B"), "flowchart");
  });

  it("detects flowchart LR", () => {
    assert.equal(detectDiagramType("flowchart LR\n  A --> B"), "flowchart");
  });

  it("detects graph (legacy flowchart)", () => {
    assert.equal(detectDiagramType("graph TD\n  A --> B"), "flowchart");
  });

  it("detects sequenceDiagram", () => {
    assert.equal(detectDiagramType("sequenceDiagram\n  Alice->>Bob: Hi"), "sequence");
  });

  it("detects classDiagram", () => {
    assert.equal(detectDiagramType("classDiagram\n  class Foo"), "classDiagram");
  });

  it("detects stateDiagram-v2", () => {
    assert.equal(detectDiagramType("stateDiagram-v2\n  [*] --> Idle"), "stateDiagram");
  });

  it("detects erDiagram", () => {
    assert.equal(detectDiagramType("erDiagram\n  CUSTOMER ||--o{ ORDER : places"), "erDiagram");
  });

  it("detects gantt", () => {
    assert.equal(detectDiagramType("gantt\n  title Plan"), "gantt");
  });

  it("detects pie", () => {
    assert.equal(detectDiagramType("pie title Share\n  \"A\" : 50"), "pie");
  });

  it("detects mindmap", () => {
    assert.equal(detectDiagramType("mindmap\n  root((Project))"), "mindmap");
  });

  it("detects timeline", () => {
    assert.equal(detectDiagramType("timeline\n  title History"), "timeline");
  });

  it("detects gitGraph", () => {
    assert.equal(detectDiagramType("gitGraph\n  commit"), "gitGraph");
  });

  it("detects quadrantChart", () => {
    assert.equal(detectDiagramType("quadrantChart\n  title Matrix"), "quadrantChart");
  });

  it("skips mermaid directives (%%)", () => {
    assert.equal(
      detectDiagramType("%%{init: {}}%%\nflowchart TD\n  A --> B"),
      "flowchart",
    );
  });

  it("skips empty lines", () => {
    assert.equal(
      detectDiagramType("\n\n  flowchart LR\n  A --> B"),
      "flowchart",
    );
  });

  it("returns unknown for empty input", () => {
    assert.equal(detectDiagramType(""), "unknown");
  });

  it("returns unknown for unrecognized input", () => {
    assert.equal(detectDiagramType("hello world"), "unknown");
  });
});
