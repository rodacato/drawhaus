import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMermaidFlowchart } from "../parser/flowchart.js";

describe("parseMermaidFlowchart", () => {
  it("parses direction", () => {
    const ast = parseMermaidFlowchart("flowchart LR\n  A --> B");
    assert.equal(ast.direction, "LR");
  });

  it("defaults to TB direction", () => {
    const ast = parseMermaidFlowchart("flowchart TD\n  A --> B");
    assert.equal(ast.direction, "TB"); // TD normalizes to TB
  });

  it("parses basic nodes and edge", () => {
    const ast = parseMermaidFlowchart(`flowchart TD
    A[Start] --> B[End]`);

    assert.equal(ast.nodes.length, 2);
    assert.equal(ast.nodes[0].id, "A");
    assert.equal(ast.nodes[0].label, "Start");
    assert.equal(ast.nodes[0].shape, "rectangle");
    assert.equal(ast.nodes[1].id, "B");
    assert.equal(ast.nodes[1].label, "End");

    assert.equal(ast.edges.length, 1);
    assert.equal(ast.edges[0].sourceId, "A");
    assert.equal(ast.edges[0].targetId, "B");
    assert.equal(ast.edges[0].hasArrow, true);
  });

  it("parses different node shapes", () => {
    const ast = parseMermaidFlowchart(`flowchart TD
    A[Rectangle]
    B(Rounded)
    C([Stadium])
    D[[Subroutine]]
    E[(Database)]
    F((Circle))
    G{Diamond}`);

    const shapes = new Map(ast.nodes.map((n) => [n.id, n.shape]));
    assert.equal(shapes.get("A"), "rectangle");
    assert.equal(shapes.get("B"), "rounded");
    assert.equal(shapes.get("C"), "stadium");
    assert.equal(shapes.get("D"), "subroutine");
    assert.equal(shapes.get("E"), "database");
    assert.equal(shapes.get("F"), "circle");
    assert.equal(shapes.get("G"), "diamond");
  });

  it("parses edge with pipe label", () => {
    const ast = parseMermaidFlowchart(`flowchart TD
    A{Decision} -->|Yes| B[OK]`);

    assert.equal(ast.edges.length, 1);
    assert.equal(ast.edges[0].label, "Yes");
    assert.equal(ast.edges[0].hasArrow, true);
  });

  it("parses edge with inline label", () => {
    const ast = parseMermaidFlowchart(`flowchart LR
    A --text--> B`);

    assert.equal(ast.edges.length, 1);
    assert.equal(ast.edges[0].label, "text");
  });

  it("parses dotted edge", () => {
    const ast = parseMermaidFlowchart(`flowchart LR
    A -.-> B`);

    assert.equal(ast.edges[0].style, "dotted");
    assert.equal(ast.edges[0].hasArrow, true);
  });

  it("parses thick edge", () => {
    const ast = parseMermaidFlowchart(`flowchart LR
    A ==> B`);

    assert.equal(ast.edges[0].style, "thick");
    assert.equal(ast.edges[0].hasArrow, true);
  });

  it("parses no-arrow edge", () => {
    const ast = parseMermaidFlowchart(`flowchart LR
    A --- B`);

    assert.equal(ast.edges[0].hasArrow, false);
    assert.equal(ast.edges[0].style, "solid");
  });

  it("parses chain syntax", () => {
    const ast = parseMermaidFlowchart(`flowchart TD
    A --> B --> C`);

    assert.equal(ast.nodes.length, 3);
    assert.equal(ast.edges.length, 2);
    assert.equal(ast.edges[0].sourceId, "A");
    assert.equal(ast.edges[0].targetId, "B");
    assert.equal(ast.edges[1].sourceId, "B");
    assert.equal(ast.edges[1].targetId, "C");
  });

  it("parses subgraphs", () => {
    const ast = parseMermaidFlowchart(`flowchart TB
    subgraph Frontend
        A[React] --> B[Router]
    end
    subgraph Backend
        C[API] --> D[DB]
    end
    B --> C`);

    assert.equal(ast.subGraphs.length, 2);
    assert.equal(ast.subGraphs[0].label, "Frontend");
    assert.ok(ast.subGraphs[0].nodeIds.includes("A"));
    assert.ok(ast.subGraphs[0].nodeIds.includes("B"));
    assert.equal(ast.subGraphs[1].label, "Backend");
    assert.ok(ast.subGraphs[1].nodeIds.includes("C"));
    assert.ok(ast.subGraphs[1].nodeIds.includes("D"));
  });

  it("parses nested subgraphs", () => {
    const ast = parseMermaidFlowchart(`flowchart TB
    subgraph Cloud
        subgraph VPC
            LB[Load Balancer]
        end
    end`);

    assert.equal(ast.subGraphs.length, 2);
    const vpc = ast.subGraphs.find((sg) => sg.id === "VPC");
    const cloud = ast.subGraphs.find((sg) => sg.id === "Cloud");
    assert.ok(vpc);
    assert.ok(cloud);
    assert.ok(cloud.childSubGraphIds.includes("VPC"));
  });

  it("handles graph keyword (legacy)", () => {
    const ast = parseMermaidFlowchart(`graph TD
    A --> B`);

    assert.equal(ast.direction, "TB");
    assert.equal(ast.nodes.length, 2);
  });

  it("handles empty flowchart", () => {
    const ast = parseMermaidFlowchart(`flowchart TD`);
    assert.equal(ast.nodes.length, 0);
    assert.equal(ast.edges.length, 0);
  });

  it("parses decision flow from playground examples", () => {
    const ast = parseMermaidFlowchart(`flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do something]
    B -->|No| D[Do something else]
    C --> E[End]
    D --> E`);

    assert.equal(ast.nodes.length, 5);
    assert.equal(ast.edges.length, 5);

    const bNode = ast.nodes.find((n) => n.id === "B");
    assert.equal(bNode?.shape, "diamond");

    const yesEdge = ast.edges.find((e) => e.label === "Yes");
    assert.ok(yesEdge);
    assert.equal(yesEdge.sourceId, "B");
    assert.equal(yesEdge.targetId, "C");
  });
});
