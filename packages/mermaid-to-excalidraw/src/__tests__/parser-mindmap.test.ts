import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMermaidMindmap } from "../parser/mindmap.js";

describe("parseMermaidMindmap", () => {
  it("parses root node", () => {
    const ast = parseMermaidMindmap(`mindmap
  Root`);

    assert.ok(ast.root);
    assert.equal(ast.root.label, "Root");
    assert.equal(ast.root.shape, "default");
  });

  it("parses root with circle shape", () => {
    const ast = parseMermaidMindmap(`mindmap
  ((Project))`);

    assert.ok(ast.root);
    assert.equal(ast.root.label, "Project");
    assert.equal(ast.root.shape, "circle");
  });

  it("parses root with square shape", () => {
    const ast = parseMermaidMindmap(`mindmap
  [Project]`);

    assert.ok(ast.root);
    assert.equal(ast.root.label, "Project");
    assert.equal(ast.root.shape, "square");
  });

  it("parses root with rounded shape", () => {
    const ast = parseMermaidMindmap(`mindmap
  (Project)`);

    assert.ok(ast.root);
    assert.equal(ast.root.shape, "rounded");
  });

  it("parses children by indentation", () => {
    const ast = parseMermaidMindmap(`mindmap
  Root
    Child A
    Child B
    Child C`);

    assert.ok(ast.root);
    assert.equal(ast.root.children.length, 3);
    assert.equal(ast.root.children[0].label, "Child A");
    assert.equal(ast.root.children[1].label, "Child B");
    assert.equal(ast.root.children[2].label, "Child C");
  });

  it("parses nested hierarchy", () => {
    const ast = parseMermaidMindmap(`mindmap
  Root
    Level1
      Level2A
      Level2B
    Level1B`);

    assert.ok(ast.root);
    assert.equal(ast.root.children.length, 2);
    assert.equal(ast.root.children[0].label, "Level1");
    assert.equal(ast.root.children[0].children.length, 2);
    assert.equal(ast.root.children[0].children[0].label, "Level2A");
    assert.equal(ast.root.children[1].label, "Level1B");
  });

  it("parses different node shapes", () => {
    const ast = parseMermaidMindmap(`mindmap
  Root
    [Square]
    (Rounded)
    ((Circle))
    {{Hexagon}}`);

    assert.ok(ast.root);
    assert.equal(ast.root.children.length, 4);
    assert.equal(ast.root.children[0].shape, "square");
    assert.equal(ast.root.children[1].shape, "rounded");
    assert.equal(ast.root.children[2].shape, "circle");
    assert.equal(ast.root.children[3].shape, "hexagon");
  });

  it("parses icon syntax", () => {
    const ast = parseMermaidMindmap(`mindmap
  Root
    Tasks::icon(fa fa-tasks)`);

    assert.ok(ast.root);
    assert.equal(ast.root.children[0].label, "Tasks");
    assert.equal(ast.root.children[0].icon, "fa fa-tasks");
  });

  it("strips :::className syntax", () => {
    const ast = parseMermaidMindmap(`mindmap
  Root
    Important:::urgent`);

    assert.ok(ast.root);
    assert.equal(ast.root.children[0].label, "Important");
  });

  it("handles empty mindmap", () => {
    const ast = parseMermaidMindmap(`mindmap`);
    assert.equal(ast.root, null);
  });

  it("skips comments", () => {
    const ast = parseMermaidMindmap(`mindmap
  Root
    %% This is a comment
    Child`);

    assert.ok(ast.root);
    assert.equal(ast.root.children.length, 1);
    assert.equal(ast.root.children[0].label, "Child");
  });

  it("parses playground Project Brainstorm example", () => {
    const ast = parseMermaidMindmap(`mindmap
  root((Project))
    Frontend
      React
      TypeScript
      Tailwind
    Backend
      Node.js
      PostgreSQL
      Redis
    DevOps
      Docker
      CI/CD
      Monitoring`);

    assert.ok(ast.root);
    assert.equal(ast.root.label, "Project");
    assert.equal(ast.root.shape, "circle");
    assert.equal(ast.root.children.length, 3);

    const frontend = ast.root.children[0];
    assert.equal(frontend.label, "Frontend");
    assert.equal(frontend.children.length, 3);

    const backend = ast.root.children[1];
    assert.equal(backend.label, "Backend");
    assert.equal(backend.children.length, 3);

    const devops = ast.root.children[2];
    assert.equal(devops.label, "DevOps");
    assert.equal(devops.children.length, 3);
  });
});
