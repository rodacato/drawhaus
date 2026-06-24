import { describe, test, vi } from "vitest";
import assert from "node:assert/strict";

const { state, initCalls, renderCalls } = vi.hoisted(() => ({
  state: { mode: "ok" as "ok" | "throw" },
  initCalls: [] as Array<Record<string, unknown>>,
  renderCalls: [] as Array<{ id: string; code: string }>,
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: (cfg: Record<string, unknown>) => {
      initCalls.push(cfg);
    },
    render: async (id: string, code: string) => {
      renderCalls.push({ id, code });
      if (state.mode === "throw") throw new Error("parse error");
      return { svg: `<svg data-id="${id}"/>` };
    },
  },
}));

import { renderMermaid } from "../lib/diagram-code/mermaid-renderer";

describe("diagram-code/mermaid-renderer renderMermaid", () => {
  test("initializes mermaid once, renders successive svgs, and propagates render errors", async () => {
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

    state.mode = "throw";
    await assert.rejects(() => renderMermaid("invalid"), /parse error/);
    assert.equal(initCalls.length, 1, "initialize should not be called again");
  });
});
