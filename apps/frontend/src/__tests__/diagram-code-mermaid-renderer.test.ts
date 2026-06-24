import test, { describe, mock, after } from "node:test";
import assert from "node:assert/strict";

describe("diagram-code/mermaid-renderer renderMermaid", () => {
  after(() => mock.restoreAll());

  test("initializes mermaid once, renders successive svgs, and propagates render errors", async () => {
    type Mode = "ok" | "throw";
    let mode: Mode = "ok";
    const initCalls: Array<Record<string, unknown>> = [];
    const renderCalls: Array<{ id: string; code: string }> = [];

    mock.module("mermaid", {
      defaultExport: {
        initialize: (cfg: Record<string, unknown>) => {
          initCalls.push(cfg);
        },
        render: async (id: string, code: string) => {
          renderCalls.push({ id, code });
          if (mode === "throw") throw new Error("parse error");
          return { svg: `<svg data-id="${id}"/>` };
        },
      },
    });

    const { renderMermaid } = await import("../lib/diagram-code/mermaid-renderer");

    const svgA = await renderMermaid("graph TD\nA-->B");
    const svgB = await renderMermaid("flowchart LR\nC-->D");

    assert.equal(initCalls.length, 1);
    assert.deepEqual(initCalls[0], {
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
      fontFamily: "sans-serif",
    });
    assert.equal(renderCalls.length, 2);
    assert.match(renderCalls[0].id, /^mermaid-preview-\d+$/);
    assert.notEqual(renderCalls[0].id, renderCalls[1].id);
    assert.equal(renderCalls[0].code, "graph TD\nA-->B");
    assert.equal(renderCalls[1].code, "flowchart LR\nC-->D");
    assert.equal(svgA, `<svg data-id="${renderCalls[0].id}"/>`);
    assert.equal(svgB, `<svg data-id="${renderCalls[1].id}"/>`);

    mode = "throw";
    await assert.rejects(() => renderMermaid("invalid"), /parse error/);
    assert.equal(initCalls.length, 1, "initialize should not be called again");
  });
});
